// ============================
// USING STATEMENTS
// ============================
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.SecretManager.V1;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using Firebase.Database;

// Disable noisy network change notifications in container environments
AppContext.SetSwitch("System.Net.DisableNetworkChangeNotification", true);

var builder = WebApplication.CreateBuilder(args);

// =================================================================
// 1. REGISTER SERVICES
// =================================================================

// Google Secret Manager client
builder.Services.AddSingleton(_ => SecretManagerServiceClient.Create());

// HttpContext accessor
builder.Services.AddHttpContextAccessor();

// Controllers and Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Firebase Realtime Database client wrapper
builder.Services.AddSingleton<FirebaseService>(sp =>
{
    var secretClient = sp.GetRequiredService<SecretManagerServiceClient>();
    string projectId = "musterus-api";

    string GetSecret(string secretId)
    {
        var name = new SecretVersionName(projectId, secretId, "latest");
        var result = secretClient.AccessSecretVersion(name);
        return result.Payload.Data.ToStringUtf8();
    }

    var databaseUrl = GetSecret("Firebase-DatabaseURL");

    var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();

    Func<Task<string>> authTokenFactory = async () =>
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
            return string.Empty;

        var authorizationHeader = httpContext.Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authorizationHeader) || !authorizationHeader.StartsWith("Bearer "))
            return string.Empty;

        return await Task.FromResult(authorizationHeader.Substring("Bearer ".Length));
    };

    var client = new FirebaseClient(
        databaseUrl,
        new FirebaseOptions { AuthTokenAsyncFactory = authTokenFactory }
    );

    return new FirebaseService(client, databaseUrl);
});

// Redis connection
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var secretClient = sp.GetRequiredService<SecretManagerServiceClient>();
    string projectId = "musterus-api";

    string GetSecret(string secretId)
    {
        var name = new SecretVersionName(projectId, secretId, "latest");
        var result = secretClient.AccessSecretVersion(name);
        return result.Payload.Data.ToStringUtf8();
    }

    var redisConn = GetSecret("Redis-ConnectionString");
    if (string.IsNullOrEmpty(redisConn))
        throw new InvalidOperationException("Redis connection string missing.");

    var configOptions = ConfigurationOptions.Parse(redisConn);
    return ConnectionMultiplexer.Connect(configOptions);
});

// Firebase Authentication setup
var projectId = "musterus-api";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{projectId}";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{projectId}",
            ValidateAudience = true,
            ValidAudience = projectId,
            ValidateLifetime = true,
            NameClaimType = "name"
        };
    });

// =================================================================
// 2. BUILD APP
// =================================================================
var app = builder.Build();

// =================================================================
// 3. POST-BUILD INITIALIZATION (Firebase Admin)
// =================================================================
app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        Console.WriteLine("Initializing Firebase Admin SDK...");
        var secretClient = app.Services.GetRequiredService<SecretManagerServiceClient>();
        var secret = secretClient.AccessSecretVersion(
            new SecretVersionName(projectId, "Firebase-GoogleCredentialJson", "latest"));

        if (FirebaseApp.DefaultInstance == null)
        {
            FirebaseApp.Create(new AppOptions
            {
                Credential = GoogleCredential.FromJson(secret.Payload.Data.ToStringUtf8())
            });
        }

        // Register FirebaseAuth after app creation
        var services = app.Services as IServiceProvider;
        var firebaseAuth = FirebaseAuth.DefaultInstance;
        // Use an extension scope if needed, not re-adding to builder.Services (read-only now)
        Console.WriteLine("Firebase Admin initialized successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Firebase initialization error: {ex.Message}");
    }
});

// =================================================================
// 4. PIPELINE CONFIGURATION
// =================================================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// =================================================================
// 5. RUN
// =================================================================
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");
