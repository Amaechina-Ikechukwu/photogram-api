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
var builder = WebApplication.CreateBuilder(args);

// =================================================================
// 1. CONFIGURE SERVICES (Dependency Injection)
// =================================================================

// --- Load Secrets from Google Secret Manager ---
var projectId = "musterus-api";
string GetSecret(string secretId)
{
    var client = SecretManagerServiceClient.Create();
    var secretName = new SecretVersionName(projectId, secretId, "latest");
    AccessSecretVersionResponse result = client.AccessSecretVersion(secretName);
    return result.Payload.Data.ToStringUtf8();
}

// --- Firebase Admin SDK ---
var firebaseCredentials = GetSecret("Firebase-GoogleCredentialJson");
FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromJson(firebaseCredentials)
});

// --- Basic ASP.NET Setup ---
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- Redis Service Registration ---
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var redisConn = GetSecret("Redis-ConnectionString");
    if (string.IsNullOrEmpty(redisConn))
    {
        throw new InvalidOperationException("Redis connection string not found in configuration or Secret Manager.");
    }

    // Create and return Redis connection
    var configOptions = ConfigurationOptions.Parse(redisConn);
    return ConnectionMultiplexer.Connect(configOptions);
});

builder.Services.AddHttpContextAccessor();

// --- Firebase Service Registration ---


builder.Services.AddSingleton<FirebaseService>(sp =>
{
    var databaseUrl = GetSecret("Firebase-DatabaseURL");
    if (string.IsNullOrEmpty(databaseUrl))
    {
        throw new InvalidOperationException("Firebase database URL not found in Secret Manager.");
    }

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
        new FirebaseOptions
        {
            AuthTokenAsyncFactory = authTokenFactory
        }
    );

    return new FirebaseService(client);
});

builder.Services.AddSingleton(FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance);

// --- Firebase Authentication Middleware ---
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

var app = builder.Build();

// =================================================================
// 2. CONFIGURE HTTP REQUEST PIPELINE
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
app.Run();
