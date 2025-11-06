using Firebase.Database;
using Firebase.Database.Query;

public class FirebaseService
{
    private readonly FirebaseClient _client;
    private readonly FirebaseClient _anonymousClient;

    public FirebaseService(FirebaseClient client, string databaseUrl)
    {
        _client = client;
        // Create an anonymous client without auth token
        _anonymousClient = new FirebaseClient(databaseUrl);
    }

    // For backward compatibility with existing code
    public FirebaseService(FirebaseClient client) : this(client, string.Empty)
    {
        _client = client;
        _anonymousClient = client; // Fallback to the same client if URL not provided
    }

    public async Task<T?> GetAsync<T>(string path) where T : class
    {
        return await _client
            .Child(path)
            .OnceSingleAsync<T>();
    }

    public async Task<T?> GetAsyncAnonymous<T>(string path) where T : class
    {
        return await _anonymousClient
            .Child(path)
            .OnceSingleAsync<T>();
    }

    public async Task SetAsync<T>(string path, T? data) where T : class
    {
        await _client
            .Child(path)
            .PutAsync(data);
    }

    public async Task PushAsync<T>(string path, T data)
    {
        await _client
            .Child(path)
            .PostAsync(data);
    }

    public async Task UpdateAsync<T>(string path, T data) where T : class
    {
        await _client
            .Child(path)
            .PatchAsync(data);
    }
}
