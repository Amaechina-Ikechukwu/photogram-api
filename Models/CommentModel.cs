namespace Photogram_Api.Models
{
    public class CommentModel
    {
        public string Id { get; set; }
        public string PostId { get; set; }
        public string UserId { get; set; }
        public string Text { get; set; }
        public long Timestamp { get; set; }
    }
}