using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Photogram_Api.Models;
using Photogram_Api.Extensions;
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
        public async Task<IActionResult> GetPublicPhotos(int page = 1, int pageSize = 10)
        {
            var publicPhotos = await _firebaseService.GetAsyncAnonymous<Dictionary<string, PhotoModel>>("images/public");

            if (publicPhotos == null)
            {
               
                return NotFound();
            }

            

            var result = new List<PhotoWithUserModel>();

            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            // --- FIX 1: Fetch ALL likes ONCE, before the loop ---
            var allLikes = await _firebaseService.GetAsyncAnonymous<Dictionary<string, LikeModel>>("likes");

            // Create a fast lookup (PostId -> List of Likes)
#pragma warning disable CS8619 // Nullability of reference types in value doesn't match target type.

            var likesLookup = allLikes?.Values.ToLookup(l => l.PostId) ?? Enumerable.Empty<LikeModel>().ToLookup(l => (string)null);
#pragma warning restore CS8619 // Nullability of reference types in value doesn't match target type.

            // --- FIX 2: Get authenticated user ID ONCE, before the loop ---

            var authenticatedUid = User.GetFirebaseUid(); // Assumes you have an extension method for this

            // --- FIX 3: Apply pagination FIRST ---
            // We order by something (like CreatedAt) for stable pagination
            // Then we apply Skip/Take, so we only process 10 items.
            var paginatedPhotoEntries = publicPhotos
                .OrderByDescending(kvp => kvp.Value.CreatedAt) // !! YOU MUST ORDER BY SOMETHING !!
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

           

         foreach (var kvp in paginatedPhotoEntries)
            {
                // --- FIX 4: Correctly get key and value ---
                var photoId = kvp.Key;
                var photo = kvp.Value;
                photo.id = photoId; // Now this works

                // This code now only runs 10 times (pageSize)
                var user = await _firebaseService.GetAsyncAnonymous<UserModel>($"users/{photo.Uid}");

                if (user != null)
                {
                    // This is still an N+1 call, but it's limited to 'pageSize' (10 calls)
                    // A better fix is denormalizing 'numberOfUploads' onto the user object
                    var userImagesPath = $"users/{photo.Uid}/images";
                    var userImages = await _firebaseService.GetAsyncAnonymous<Dictionary<string, object>>(userImagesPath);
                    user.NumberOfUploads = userImages?.Count ?? 0;
                }

                // --- Use the fast lookup (no database call) ---
                var photoLikes = likesLookup[photoId].ToList();
                photo.Likes = photoLikes.Count;

                var hasLiked = authenticatedUid != null && photoLikes.Any(l => l.UserId == authenticatedUid);

                result.Add(new PhotoWithUserModel { Photo = photo, User = user, HasLiked = hasLiked });
            }
            var paginatedResult = result.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(new { sucess = true, message = "Public photos retrieved successfully", data = paginatedResult });
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetPhotosByCategory(int page = 1, int pageSize = 10)
        {
            var allPhotos = await _firebaseService.GetAsync<Dictionary<string, PhotoModel>>("images/public");

            if (allPhotos == null)
            {
               
                return NotFound();
            }

          
            // Get all likes once
            var likes = await _firebaseService.GetAsync<Dictionary<string, LikeModel>>("likes");
            var authenticatedUid = User.GetFirebaseUid();

            var photosByCategory = new Dictionary<string, List<PhotoWithUserModel>>();

            foreach (var kvp in allPhotos)
            {
                var photo = kvp.Value;
                photo.id = kvp.Key;

                if (!string.IsNullOrWhiteSpace(photo.Category))
                {
                    // Get user information
                    var user = await _firebaseService.GetAsync<UserModel>($"users/{photo.Uid}");
                    
                    if (user != null)
                    {
                        // Get user's images to calculate numberOfUploads
                        var userImagesPath = $"users/{photo.Uid}/images";
                        var userImages = await _firebaseService.GetAsync<Dictionary<string, object>>(userImagesPath);
                        user.NumberOfUploads = userImages?.Count ?? 0;
                    }

                    // Calculate likes for this photo
                    var photoLikes = likes?.Values.Where(l => l.PostId == photo.id).ToList();
                    photo.Likes = photoLikes?.Count ?? 0;

                    // Check if authenticated user has liked this photo
                    var hasLiked = authenticatedUid != null && photoLikes?.Any(l => l.UserId == authenticatedUid) == true;

                    var photoWithUser = new PhotoWithUserModel 
                    { 
                        Photo = photo, 
                        User = user, 
                        HasLiked = hasLiked 
                    };

                    if (!photosByCategory.TryGetValue(photo.Category, out List<PhotoWithUserModel>? value))
                    {
                        value = [];
                        photosByCategory[photo.Category] = value;
                    }

                    value.Add(photoWithUser);
                }
            }

            var paginatedPhotosByCategory = photosByCategory.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.Skip((page - 1) * pageSize).Take(pageSize).ToList()
            );

            return Ok(new{sucess = true, message = "Categories retrieved successfully", data = paginatedPhotosByCategory});
        }

        [AllowAnonymous]
        [HttpPost("{id}/view")]
        public async Task<IActionResult> IncrementView(string id)
        {
            var photo = await _firebaseService.GetAsyncAnonymous<PhotoModel>($"images/public/{id}");

            if (photo == null)
            {
                return NotFound();
            }

            var user = await _firebaseService.GetAsyncAnonymous<UserModel>($"users/{photo.Uid}");

            if (user == null)
            {
                return NotFound();
            }

            photo.Views++;
            user.TotalViews++;

            await _firebaseService.UpdateAsync($"images/public/{id}", photo);
            await _firebaseService.UpdateAsync($"users/{photo.Uid}", user);

            return Ok(new { success = true, message = "View count incremented successfully" });
        }
    }
}
