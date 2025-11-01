using Firebase.Database;
using Firebase.Database.Query;

public class FirebaseService
{
    private readonly FirebaseClient _client;

    public FirebaseService(FirebaseClient client)
    {
        _client = client;
    }

    public async Task<T> GetAsync<T>(string path)
    {
        return await _client
            .Child(path)
            .OnceSingleAsync<T>();
    }

    public async Task SetAsync<T>(string path, T data)
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
}
