namespace Photogram_Api.Models
{
    public class CommentModel
    {
        public string Id { get; set; } = string.Empty;
        public string PostId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public long Timestamp { get; set; }
    }
}