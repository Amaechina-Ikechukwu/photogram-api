// ============================
// USING STATEMENTS
// ============================
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.SecretManager.V1;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using Firebase.Database;

AppContext.SetSwitch("System.Net.DisableNetworkChangeNotification", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();

// =================================================================
// Register Lazy SecretManagerServiceClient (created when needed)
// =================================================================
builder.Services.AddSingleton<SecretManagerServiceClient>(_ =>
    SecretManagerServiceClient.Create());

// =================================================================
// Firebase Service Registration (lazy loading inside constructor)
// =================================================================
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

    return new FirebaseService(client);
});

// =================================================================
// Post-Build Initialization (safe time to access Secret Manager)
// =================================================================
var app = builder.Build();

app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        Console.WriteLine("Initializing FirebaseApp after network ready...");
        var secretClient = app.Services.GetRequiredService<SecretManagerServiceClient>();
        string projectId = "musterus-api";
        var name = new SecretVersionName(projectId, "Firebase-GoogleCredentialJson", "latest");
        var secret = secretClient.AccessSecretVersion(name);
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromJson(secret.Payload.Data.ToStringUtf8())
        });
        Console.WriteLine("Firebase Admin initialized successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Firebase init error: {ex.Message}");
    }
});

// =================================================================
// Auth + Middleware
// =================================================================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var projectId = "musterus-api";
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Required by Cloud Run
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");
