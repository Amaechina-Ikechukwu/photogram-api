using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Photogram_Api.Models;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Photogram_Api.Controllers
{
    
    [ApiController]
    [Route("api/photos")]
    public class PhotosController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;

        public PhotosController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        [AllowAnonymous]
        [HttpGet("public")]
        public async Task<IActionResult> GetPublicPhotos()
        {
            var publicPhotos = await _firebaseService.GetAsyncAnonymous<Dictionary<string, PhotoModel>>("images/public");

            if (publicPhotos == null)
            {
                Console.WriteLine("[ERROR] No public photos found at 'images/public'");
                return NotFound();
            }

            Console.WriteLine($"[INFO] Found {publicPhotos.Count} public photos");
            
            // Debug: Log raw photo data structure
            Console.WriteLine("[DEBUG] Raw photo data from Firebase:");
            Console.WriteLine(JsonSerializer.Serialize(publicPhotos, new JsonSerializerOptions { WriteIndented = true }));

            var result = new List<PhotoWithUserModel>();

            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            foreach (var photo in publicPhotos.Values)
            {
                    Console.WriteLine($"[DEBUG] Processing photo for user: {photo.Uid}");
                    
                    // Use Tags as fallback if Categories is null
                    if (photo.Categories == null && photo.Tags != null)
                    {
                        photo.Categories = photo.Tags;
                        Console.WriteLine($"[DEBUG] Using Tags as Categories for photo");
                    }
                    
                    var user = await _firebaseService.GetAsyncAnonymous<UserModel>($"users/{photo.Uid}");

                    if (user != null)
                    {
                        // Get user's images to calculate numberOfUploads
                        var userImagesPath = $"users/{photo.Uid}/images";
                        Console.WriteLine($"[DEBUG] Fetching user images from: {userImagesPath}");
                        
                        var userImages = await _firebaseService.GetAsyncAnonymous<Dictionary<string, object>>(userImagesPath);
                        user.NumberOfUploads = userImages?.Count ?? 0;

                        Console.WriteLine($"[DEBUG] User {photo.Uid} has {user.NumberOfUploads} uploaded images");
                    }

                    if (user == null)
                    {
                        // Log the photo and note the missing user so it's easier to inspect in logs
                        Console.WriteLine(JsonSerializer.Serialize(new
                        {
                            Photo = photo,
                            User = (object?)null,
                            Message = $"User with id {photo.Uid} not found"
                        }, jsonOptions));
                    }
                    else
                    {
                        // Log the combined object (pretty-printed) for easier debugging
                        Console.WriteLine(JsonSerializer.Serialize(new { Photo = photo, User = user }, jsonOptions));
                    }

                    result.Add(new PhotoWithUserModel { Photo = photo, User = user });
            }

            return Ok(result);
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetPhotosByCategory()
        {
            var allPhotos = await _firebaseService.GetAsync<Dictionary<string, PhotoModel>>("images/public");

            if (allPhotos == null)
            {
                return NotFound();
            }

            // Use Tags as fallback for Categories
            foreach (var photo in allPhotos.Values)
            {
                if (photo.Categories == null && photo.Tags != null)
                {
                    photo.Categories = photo.Tags;
                }
            }

            var result = allPhotos.Values
                .SelectMany(p => (p.Categories ?? p.Tags)?.Select(c => new { Category = c, Photo = p }) ?? Enumerable.Empty<dynamic>())
                .GroupBy(x => x.Category)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Photo));

            return Ok(result);
        }
    }
}
