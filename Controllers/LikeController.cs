using Microsoft.AspNetCore.Mvc;
using Photogram_Api.Models;
using Photogram_Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Photogram_Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LikeController : ControllerBase
    {
        private readonly FirebaseService _firebase;

        public LikeController(FirebaseService firebase)
        {
            _firebase = firebase;
        }

        [HttpPost("toggle/{postId}")]
        [Authorize]
        public async Task<ActionResult> ToggleLike(string postId)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            // Get the photo to find the owner
            var photo = await _firebase.GetAsync<PhotoModel>($"images/public/{postId}");
            if (photo == null)
            {
                return NotFound(new { success = false, message = "Photo not found." });
            }

            var likes = await _firebase.GetAsync<Dictionary<string, LikeModel>>("likes");
            var existingLike = likes?.FirstOrDefault(l => l.Value.PostId == postId && l.Value.UserId == authenticatedUid);

            if (existingLike.HasValue && existingLike.Value.Key != null)
            {
                // Unlike - delete the existing like
                await _firebase.SetAsync<LikeModel>($"likes/{existingLike.Value.Key}", null);

                // Decrement photo owner's total likes
                if (!string.IsNullOrEmpty(photo.Uid))
                {
                    var photoOwner = await _firebase.GetAsync<UserModel>($"users/{photo.Uid}");
                    if (photoOwner != null)
                    {
                        photoOwner.TotalLikes = Math.Max(0, photoOwner.TotalLikes - 1);
                        await _firebase.UpdateAsync($"users/{photo.Uid}", photoOwner);
                    }
                }

                return Ok(new { success = true, message = "Like removed successfully.", hasLiked = false });
            }
            else
            {
                // Like - create a new like
                var newLike = new LikeModel
                {
                    Id = Guid.NewGuid().ToString(),
                    PostId = postId,
                    UserId = authenticatedUid
                };

                await _firebase.SetAsync($"likes/{newLike.Id}", newLike);

                // Increment photo owner's total likes
                if (!string.IsNullOrEmpty(photo.Uid))
                {
                    var photoOwner = await _firebase.GetAsync<UserModel>($"users/{photo.Uid}");
                    if (photoOwner != null)
                    {
                        photoOwner.TotalLikes++;
                        await _firebase.UpdateAsync($"users/{photo.Uid}", photoOwner);
                    }
                }

                return Ok(new { success = true, message = "Like added successfully.", hasLiked = true, data = newLike });
            }
        }

        [HttpGet("check/{postId}")]
        [Authorize]
        public async Task<ActionResult> CheckIfLiked(string postId)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            var likes = await _firebase.GetAsync<Dictionary<string, LikeModel>>("likes");
            var hasLiked = likes?.Values.Any(l => l.PostId == postId && l.UserId == authenticatedUid) ?? false;

            return Ok(new { success = true, hasLiked = hasLiked });
        }
    }
}