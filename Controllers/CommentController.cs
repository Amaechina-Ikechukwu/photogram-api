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
    public class CommentController : ControllerBase
    {
        private readonly FirebaseService _firebase;

        public CommentController(FirebaseService firebase)
        {
            _firebase = firebase;
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> CreateComment([FromBody] CommentModel commentModel)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            commentModel.UserId = authenticatedUid;
            commentModel.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            commentModel.Id = Guid.NewGuid().ToString();

            await _firebase.SetAsync($"comments/{commentModel.Id}", commentModel);

            return Ok(new { success = true, data = commentModel });
        }

        [HttpGet("post/{postId}")]
        public async Task<ActionResult<List<CommentModel>>> GetCommentsByPost(string postId)
        {
            var comments = await _firebase.GetAsync<Dictionary<string, CommentModel>>("comments");
            if (comments == null)
            {
                return Ok(new { success = true, data = new List<CommentModel>() });
            }

            var postComments = comments.Values.Where(c => c.PostId == postId).ToList();
            return Ok(new { success = true, data = postComments });
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult> UpdateComment(string id, [FromBody] CommentModel commentModel)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            var existingComment = await _firebase.GetAsync<CommentModel>($"comments/{id}");
            if (existingComment == null)
            {
                return NotFound();
            }

            if (existingComment.UserId != authenticatedUid)
            {
                return Forbid("You can only update your own comments.");
            }

            commentModel.Id = id;
            commentModel.UserId = authenticatedUid;

            await _firebase.SetAsync($"comments/{id}", commentModel);

            return Ok(new { success = true, message = "Comment updated successfully." });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<ActionResult> DeleteComment(string id)
        {
            var authenticatedUid = User.GetFirebaseUid();
            if (authenticatedUid == null)
            {
                return Unauthorized("Firebase UID not found in token.");
            }

            var existingComment = await _firebase.GetAsync<CommentModel>($"comments/{id}");
            if (existingComment == null)
            {
                return NotFound();
            }

            if (existingComment.UserId != authenticatedUid)
            {
                return Forbid("You can only delete your own comments.");
            }

            await _firebase.SetAsync<CommentModel>($"comments/{id}", null);

            return Ok(new { success = true, message = "Comment deleted successfully." });
        }
    }
}