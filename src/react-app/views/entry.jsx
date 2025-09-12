import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Avatar, Image,
  ImageViewer, DotLoading,
  SafeArea, PullToRefresh,
  Skeleton, ActionSheet,
  Toast, ErrorBlock, Popover
} from "antd-mobile";
import { useMount } from "ahooks";
import { useAuth } from "../utils/authContext";
import { recordsApi } from "../utils/api";
import CommentModal from "../components/CommentModal";
import {
  HeartOutline,
  MessageOutline,
  // ShareOutline,
  MoreOutline,
  LocationOutline,
  PlayOutline,
  // TimeOutline
} from 'antd-mobile-icons';
import styles from './entry.module.css';

const Entry = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [likeAnimating, setLikeAnimating] = useState({});
  // 重复点击点赞防抖
  const [likeClicking, setLikeClicking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const handler = useRef(null);
  const containerRef = useRef(null);

  // 转换API数据为前端展示格式
  const transformRecordToPost = (record) => {
    // 解析媒体内容
    let images = [], extra_data = {};
    if (record.content_media) {
      try {
        const mediaData = JSON.parse(record.content_media);
        if (Array.isArray(mediaData)) {
          images = mediaData;
        }
      } catch (error) {
        console.error('解析媒体内容失败:', error);
      }
    }
    if (record.extra_data) {
      try {
        extra_data = JSON.parse(record.extra_data);
      } catch (error) {
        console.error('解析额外数据失败:', error);
      }
    }

    // 计算时间差
    const getTimeAgo = (createdAt) => {
      if (!createdAt) return '刚刚';
      const now = new Date();
      const created = new Date(createdAt);

      // 增加8小时到创建时间
      created.setHours(created.getHours() + 8);

      const diffMs = now - created;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return `${diffDays}天前`;
      } else if (diffHours > 0) {
        return `${diffHours}小时前`;
      } else {
        return '刚刚';
      }
    };

    // 处理点赞数据
    const likesArray = Array.isArray(extra_data?.likes) ? extra_data.likes : [];
    const commentsArray = Array.isArray(extra_data?.comments) ? extra_data.comments : [];

    return {
      id: record.id,
      user: {
        name: record.creator_name,
        avatar: extra_data?.avatar || `https://via.placeholder.com/40x40/${Math.floor(Math.random() * 16777215).toString(16)}/FFFFFF?text=${(record.creator?.name || 'U').charAt(0)}`,
        verified: record?.role === 'admin'
      },
      content: record.content_text || '',
      images: images,
      likes: likesArray.length,
      likesData: likesArray,
      comments: commentsArray.length,
      commentsData: commentsArray,
      shares: extra_data?.shares || 0,
      time: getTimeAgo(record.created_at),
      location: extra_data?.location || '',
      isLargeImage: images.length === 1
    };
  };

  // 初始化用户点赞状态
  const initializeLikedPosts = useCallback((posts) => {
    if (!user) return;

    const likedPostIds = new Set();
    posts.forEach(post => {
      if (post.likesData && Array.isArray(post.likesData)) {
        const hasLiked = post.likesData.some(like => like.userId === user.id);
        if (hasLiked) {
          likedPostIds.add(post.id);
        }
      }
    });
    setLikedPosts(likedPostIds);
  }, [user]);

  // 获取记录数据
  const fetchRecords = async (pageNum = 1, isRefresh = false) => {
    try {
      setLoading(true);
      const response = await recordsApi.getRecords({
        page: pageNum,
        limit: 10
      });

      const transformedPosts = response.records?.map(transformRecordToPost) || [];

      if (isRefresh) {
        setPosts(transformedPosts);
        initializeLikedPosts(transformedPosts);
      } else {
        setPosts(prev => {
          const newPosts = [...prev, ...transformedPosts];
          initializeLikedPosts(newPosts);
          return newPosts;
        });
      }
      const curPagination = response.pagination || {};
      setPagination(curPagination);
      setHasMore(curPagination.page < curPagination.pages);
    } catch (error) {
      console.error('获取记录失败:', error);
      Toast.show({
        content: '获取数据失败，请重试',
        position: 'center',
      });
    } finally {
      setLoading(false);
    }
  }

  useMount(() => {
    fetchRecords(1, true).finally(() => {
      setInitialLoading(false);
    });
  });

  // 刷新数据
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords(1, true);
    setPage(1);
    setRefreshing(false);
  };

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    await fetchRecords(nextPage, false);
    setPage(nextPage);
  }, [loading, hasMore, page]);

  // 滚动监听
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 100; // 距离底部100px时开始加载

    if (scrollHeight - scrollTop - clientHeight < threshold && !loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore]);

  // 添加滚动监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleLike = async (postId) => {
    if (!user) {
      Toast.show({
        content: '请先登录',
        position: 'center',
      });
      return;
    }
    if (likeClicking) {
      return;
    }
    setLikeClicking(true);
    // 觸發動畫
    setLikeAnimating(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setLikeAnimating(prev => ({ ...prev, [postId]: false }));
    }, 500);
    try {
      // 优化用户体验，先更新前端状态
      toggleLikeLocal(postId);
      // 调用API切换点赞状态
      const result = await recordsApi.toggleLike(postId, user.id, user.name);

      // 更新帖子数据
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: result.likesCount,
            likesData: result.record.extra_data ? JSON.parse(result.record.extra_data).likes || [] : []
          };
        }
        return post;
      }));

    } catch (error) {
      console.error('点赞操作失败:', error);
      // 回滚前端状态
      toggleLikeLocal(postId);
      Toast.show({
        content: '操作失败，请重试',
        position: 'center',
      });
    } finally {
      setLikeClicking(false);
    }
  };

  // 本地切换点赞状态
  const toggleLikeLocal = (postId) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = likedPosts.has(postId);
        return {
          ...post,
          likes: isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const handleImageClick = (images, index) => {
    const formattedImages = images.map(img => {
      if (typeof img === 'string') {
        return img;
      } else if (img.url) {
        return img.url;
      }
      return '';
    }).filter(url => url);
    ImageViewer.Multi.show({
      images: formattedImages,
      defaultIndex: index,
      imageRender: (src, { index }) => {
        const isVideo = images[index] && (typeof images[index] === 'object' && images[index].type === 'video');
        if (isVideo) {
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
              <video muted autoPlay width='100%' controls src={src} />
            </div>
          );
        }
        return <img src={src} alt="" style={{ width: '100%' }} />;
      },
    });
  };

  // 处理评论点击
  const handleCommentClick = (post) => {
    setSelectedPost(post);
    setShowComments(true);
  };

  // 添加评论
  const handleAddComment = async (postId, content) => {
    if (!user) {
      Toast.show({
        content: '请先登录',
        position: 'center',
      });
      return;
    }

    if (!content.trim()) {
      Toast.show({
        content: '请输入评论内容',
        position: 'center',
      });
      return;
    }

    try {
      const result = await recordsApi.addComment(postId, {
        userId: user.id,
        userName: user.name,
        avatar: user.avatar,
        content: content.trim()
      });

      // 更新帖子数据
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: result.commentsCount,
            commentsData: result.record.extra_data ? JSON.parse(result.record.extra_data).comments || [] : []
          };
        }
        return post;
      }));

      // 更新选中的帖子数据
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => ({
          ...prev,
          comments: result.commentsCount,
          commentsData: result.record.extra_data ? JSON.parse(result.record.extra_data).comments || [] : []
        }));
      }

      Toast.show({
        content: '评论成功',
        position: 'center',
      });

    } catch (error) {
      console.error('添加评论失败:', error);
      Toast.show({
        content: '评论失败，请重试',
        position: 'center',
      });
    }
  };

  // 删除评论
  const handleDeleteComment = async (postId, commentId) => {
    try {
      const result = await recordsApi.deleteComment(postId, commentId, user.id);

      // 更新帖子数据
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: result.commentsCount,
            commentsData: result.record.extra_data ? JSON.parse(result.record.extra_data).comments || [] : []
          };
        }
        return post;
      }));

      // 更新选中的帖子数据
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => ({
          ...prev,
          comments: result.commentsCount,
          commentsData: result.record.extra_data ? JSON.parse(result.record.extra_data).comments || [] : []
        }));
      }

      Toast.show({
        content: '删除成功',
        position: 'center',
      });

    } catch (error) {
      console.error('删除评论失败:', error);
      Toast.show({
        content: error.message || '删除失败，请重试',
        position: 'center',
      });
    }
  };

  const handleMore = (postId) => {
    const isDeleting = deletingPostId === postId;
    const actions = [
      {
        text: isDeleting ? '删除中...' : '删除',
        key: 'delete',
        description: '删除后数据不可恢复',
        danger: true,
        bold: true,
        disabled: isDeleting,
        onClick: async () => {
          if (isDeleting) return;
          try {
            setDeletingPostId(postId);
            await recordsApi.deleteRecord(postId);
            setPosts(prev => prev.filter(post => post.id !== postId));
            Toast.show({
              content: '删除成功',
              position: 'center',
            });
          } catch (error) {
            console.error('删除失败:', error);
            Toast.show({
              content: '删除失败，请重试',
              position: 'center',
            });
          } finally {
            setDeletingPostId(null);
          }
          handler.current?.close();
        },
      },
    ];

    handler.current = ActionSheet.show({
      // extra: '更多操作',
      cancelText: '取消',
      actions,
    });
  };

  // 骨架屏组件
  const PostSkeleton = () => (
    <div className={styles.postContainer}>
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <Skeleton animated className={styles.skeletonAvatar} />
          <div className={styles.userDetails}>
            <Skeleton animated className={styles.skeletonName} />
            <Skeleton animated className={styles.skeletonMeta} />
          </div>
        </div>
        <Skeleton animated className={styles.skeletonMore} />
      </div>

      <Skeleton animated className={styles.skeletonContent} />

      <div className={styles.skeletonImages}>
        <Skeleton animated className={styles.skeletonImage} />
        <Skeleton animated className={styles.skeletonImage} />
        <Skeleton animated className={styles.skeletonImage} />
      </div>

      <div className={styles.postActions}>
        <Skeleton animated className={styles.skeletonAction} />
        <Skeleton animated className={styles.skeletonAction} />
      </div>
    </div>
  );

  const renderPost = (post) => {
    const isDeleting = deletingPostId === post.id;
    return (
      <div key={post.id} className={`${styles.postContainer} ${isDeleting ? styles.deleting : ''}`}>
        <div className={styles.postHeader}>
          <div className={styles.userInfo}>
            <Avatar src={post.user.avatar} className={styles.userAvatar} />
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {post.user.name}
                {post.user.verified && <span className={styles.verifiedBadge}>✓</span>}
              </div>
              <div className={styles.postMeta}>
                {/* <TimeOutline className="meta-icon" /> */}
                <span>{post.time}</span>
                {post.location && (
                  <>
                    <LocationOutline className={styles.metaIcon} />
                    <span>{post.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <MoreOutline
            onClick={() => !isDeleting && handleMore(post.id)}
            className={`${styles.moreIcon} ${isDeleting ? styles.disabled : ''}`}
          />
        </div>

        {post.content && (
          <div className={styles.postContent}>
            {post.content}
          </div>
        )}

        {post.images && post.images.length > 0 && (
          <div
            className={`${styles.postImages} ${post.isLargeImage ? styles.largeImage : styles.gridImages}`}
            data-count={post.isLargeImage ? undefined : post.images.length}
          >
            {post.images.map((item, index) => (
              <div key={index} onClick={() => handleImageClick(post.images, index)} className={styles.imageWrapper}>
                <Image
                  src={item.thumbnailUrl || item.url || item}
                  width="100%"
                  height="100%"
                  fit="cover"
                  lazy
                  className={styles.postImage}
                />
                {(typeof item === 'object' && item.type === 'video') && (
                  <PlayOutline className={styles.videoPlayIcon} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.postActions}>
          <div className={styles.actionItem}>
            <HeartOutline
              className={
                `${styles.actionIcon} ${likedPosts.has(post.id) ? styles.liked : ''} ` +
                (likeAnimating[post.id] ? styles.likeAnimate : '')
              }
              onClick={() => handleLike(post.id)}
            />
            <span className={`${likedPosts.has(post.id) ? styles.liked : ''} ${styles.likesCount}`} >
              {post.likes}
            </span>
          </div>
          <div className={styles.actionItem} onClick={() => handleCommentClick(post)}>
            <MessageOutline className={styles.actionIcon} />
            <span>{post.comments}</span>
          </div>
        </div>
        {isDeleting && (
          <div className={styles.deletingOverlay}>
            <DotLoading color="white" />
            <span className={styles.deletingText}>删除中...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.entryContainer}>
      <SafeArea position='top' />
      <div className={styles.header}>
        <h1 className={styles.appTitle}>瞬间📝记录</h1>
        <div className={styles.headerActions}>
          {user && (
            <Popover
              trigger="click"
              content={
                <div >
                  {user?.role === 'admin' && (
                    <div
                      className={styles.menuItem}
                      onClick={() => {
                        navigate("/create");
                      }}
                    >
                      发布
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div
                      className={styles.menuItem}
                      onClick={() => {
                        navigate('/create-account');
                      }}
                    >
                      创建账号
                    </div>
                  )}
                  <div
                    className={`${styles.menuItem} ${styles.logoutItem}`}
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    退出
                  </div>
                </div>
              }
              placement="bottom-end"
            >
              <Avatar
                src={user?.avatar}
                className={styles.userAvatarHeader}
              />
            </Popover>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className={styles.postsFeed}
      >
        <PullToRefresh
          onRefresh={onRefresh}
          refreshing={refreshing}
          completeDelay={500}
        >
          {/* 初始加载骨架屏 */}
          {initialLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            <>
              {posts.map(renderPost)}

              {/* 加载状态 */}
              {loading && (
                <div className={styles.loadingContainer}>
                  <span className={styles.loadingText}>加载中</span>
                  <DotLoading />
                </div>
              )}

              {/* 没有更多数据 */}
              {!hasMore && posts.length > 0 && (
                <div className={styles.noMoreContainer}>
                  <span className={styles.noMoreText}>没有更多内容了</span>
                </div>
              )}
              {
                posts.length === 0 && (
                  <ErrorBlock
                    status="empty"
                    title="暂无内容"
                    description={
                      <div>
                        可点击前往
                        <a href="/create" style={{ marginLeft: 2 }}>发布</a>
                      </div>
                    }
                  />
                )
              }
            </>
          )}
        </PullToRefresh>
      </div>
      <SafeArea position='bottom' />

      {/* 评论弹窗 */}
      <CommentModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        post={selectedPost}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />
    </div>
  );
};

export default Entry;