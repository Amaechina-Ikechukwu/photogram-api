using System;
using Microsoft.AspNetCore.Mvc;
using Photogram_Api.Models;
using Photogram_Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using FirebaseAdmin.Auth;
using System.Collections.Generic;
using System.Linq;

namespace Photogram_Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : ControllerBase
    {
        private readonly FirebaseService _firebase;
        private readonly FirebaseAuth _firebaseAuth;

     public UserController(FirebaseService firebase)
    {
        _firebase = firebase;
        _firebaseAuth = FirebaseAuth.DefaultInstance;
    }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserModel>> GetCurrentUser()
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            var user = await _firebase.GetAsync<UserModel>($"users/{authenticatedUid}");

            // Compute upload count for this user (null-safe)
            var posts = await _firebase.GetAsync<Dictionary<string, UserPhotoViewModel>>(
                $"users/{authenticatedUid}/images"
            );
            var uploadsCount = posts?.Count ?? 0;

            if (user == null)
            {
                var userRecord = await _firebaseAuth.GetUserAsync(authenticatedUid);
                var name = userRecord.DisplayName;
                var email = userRecord.Email;

                var newUser = new UserModel
                {
                    Uid = authenticatedUid,
                    Name = name,
                    Email = email,
                    NumberOfUploads = uploadsCount,
                    TotalViews = 0,
                    TotalLikes = 0
                };

                await _firebase.SetAsync($"users/{authenticatedUid}", newUser);

                return Ok(new { success = true, data = newUser });
            }

            // Reflect the latest upload count on the returned object (no persistence here)
            user.NumberOfUploads = uploadsCount;
            return Ok(new { success = true, data = user });
        }

        [HttpPut]
        [Authorize]
        public async Task<ActionResult> UpdateUser([FromBody] UserModel userModel)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            if (authenticatedUid != userModel.Uid)
            {
                return Forbid("You can only update your own profile.");
            }

            await _firebase.SetAsync($"users/{authenticatedUid}", userModel);

            return Ok(new { success = true, message = "User updated successfully." });
        }

        [HttpGet("photos")]
        [Authorize]
      
public async Task<ActionResult<IEnumerable<UserPhotoViewModel>>> GetUserPhotos()
{
    var authenticatedUid = User.GetFirebaseUid();
    if (authenticatedUid == null)
        return Unauthorized("Firebase UID not found in token.");

    // Expect a dictionary: key = Firebase push ID, value = photo model
    var posts = await _firebase.GetAsync<Dictionary<string, UserPhotoViewModel>>(
        $"users/{authenticatedUid}/images"
    );

    if (posts == null)
        return Ok(new { success = true, data = new List<UserPhotoViewModel>() });

    // Map dictionary to list, including the key as Id
    var userPosts = posts.Select(entry => new UserPhotoViewModel
{
    Id = entry.Key,
    CreatedAt = entry.Value.CreatedAt,
    ImageUrl = entry.Value.ImageUrl,
    Tags = entry.Value.Tags,
    Uid = entry.Value.Uid
}).ToList();


    return Ok(new { success = true, data = userPosts });
}


    }
}