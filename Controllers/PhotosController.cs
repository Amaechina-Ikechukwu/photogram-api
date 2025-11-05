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
               
                return NotFound();
            }

            

            var result = new List<PhotoWithUserModel>();

            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            foreach (var photo in publicPhotos.Values)
            {
                    
                    
                    var user = await _firebaseService.GetAsyncAnonymous<UserModel>($"users/{photo.Uid}");

                    if (user != null)
                    {
                        // Get user's images to calculate numberOfUploads
                        var userImagesPath = $"users/{photo.Uid}/images";
                       
                        
                        var userImages = await _firebaseService.GetAsyncAnonymous<Dictionary<string, object>>(userImagesPath);
                        user.NumberOfUploads = userImages?.Count ?? 0;

                       
                    }

                

                    result.Add(new PhotoWithUserModel { Photo = photo, User = user });
            }

            return Ok(new { sucess = true, message = "Public photos retrieved successfully", data = result });
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetPhotosByCategory()
        {
            var allPhotos = await _firebaseService.GetAsync<Dictionary<string, PhotoModel>>("images/public");

            if (allPhotos == null)
            {
               
                return NotFound();
            }

          

            var photosByCategory = new Dictionary<string, List<PhotoModel>>();

            foreach (var kvp in allPhotos)
            {
                var photo = kvp.Value;
                photo.id = kvp.Key;

                if (!string.IsNullOrWhiteSpace(photo.Category))
                {
                    if (!photosByCategory.TryGetValue(photo.Category, out List<PhotoModel>? value))
                    {
                        value = [];

                        photosByCategory[photo.Category] = value;
                       
                    }

                    value.Add(photo);
                    
                }
                else
                {
                   
                }
            }

        

            return Ok(new{sucess = true, message = "Categories retrieved successfully", data = photosByCategory});
        }
    }
}
