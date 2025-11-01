using Microsoft.AspNetCore.Mvc;
using Photogram_Api.Models;
using Photogram_Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System;

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

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> CreateLike([FromBody] LikeModel likeModel)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            likeModel.UserId = authenticatedUid;
            likeModel.Id = Guid.NewGuid().ToString();

            await _firebase.SetAsync($"likes/{likeModel.Id}", likeModel);

            return Ok(new { success = true, data = likeModel });
        }

        [HttpGet("post/{postId}")]
        public async Task<ActionResult<List<LikeModel>>> GetLikesByPost(string postId)
        {
            var likes = await _firebase.GetAsync<Dictionary<string, LikeModel>>("likes");
            if (likes == null)
            {
                return Ok(new { success = true, data = new List<LikeModel>() });
            }

            var postLikes = likes.Values.Where(l => l.PostId == postId).ToList();
            return Ok(new { success = true, data = postLikes });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<ActionResult> DeleteLike(string id)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            var existingLike = await _firebase.GetAsync<LikeModel>($"likes/{id}");
            if (existingLike == null)
            {
                return NotFound();
            }

            if (existingLike.UserId != authenticatedUid)
            {
                return Forbid("You can only delete your own likes.");
            }

            await _firebase.SetAsync<LikeModel>($"likes/{id}", null);

            return Ok(new { success = true, message = "Like deleted successfully." });
        }
    }
}