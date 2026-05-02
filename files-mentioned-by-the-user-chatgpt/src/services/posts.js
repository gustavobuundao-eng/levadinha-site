(function () {
  "use strict";

  const POSTS = "levadinha.posts";

  async function listPosts() {
    return window.LevadinhaStorage.list(POSTS);
  }

  async function createPost(payload) {
    return window.LevadinhaStorage.create(POSTS, {
      author: payload.author,
      authorId: payload.authorId,
      category: payload.category || "Geral",
      content: payload.content,
      status: payload.status || "published",
      replies: payload.replies || []
    });
  }

  async function replyToPost(postId, reply) {
    const post = await window.LevadinhaStorage.read(POSTS, postId);
    if (!post) return null;
    const replies = [...(post.replies || []), { id: crypto.randomUUID?.() || String(Date.now()), createdAt: new Date().toISOString(), ...reply }];
    return window.LevadinhaStorage.update(POSTS, postId, { replies });
  }

  async function deletePost(postId) {
    return window.LevadinhaStorage.delete(POSTS, postId);
  }

  window.LevadinhaPosts = { listPosts, createPost, replyToPost, deletePost };
})();
