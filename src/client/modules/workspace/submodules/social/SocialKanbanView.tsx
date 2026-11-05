import React from 'react';
import { WorkspacePost, SocialPostStatus } from '../../../../shared/types';
import { POST_STATUS_MAP } from '../../types';

interface SocialKanbanViewProps {
  posts: WorkspacePost[];
  onOpenEditPost: (post: WorkspacePost) => void;
  onQuickChangePostStatus: (post: WorkspacePost, nextStatus: SocialPostStatus) => void;
}

export const SocialKanbanView: React.FC<SocialKanbanViewProps> = ({
  posts,
  onOpenEditPost,
  onQuickChangePostStatus,
}) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {(['idea', 'writing', 'design', 'review', 'approved'] as SocialPostStatus[]).map((statusCol) => {
          const colConfig = POST_STATUS_MAP[statusCol];
          const colPosts = posts.filter((p) => p.status === statusCol);

          return (
            <div
              key={statusCol}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex flex-col min-h-[500px]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colConfig.bg} ${colConfig.text}`}>
                  {colConfig.label}
                </span>
                <span className="text-xs font-bold text-slate-400">{colPosts.length}</span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onOpenEditPost(post)}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer"
                  >
                    {(post.finalArtMediaUrl || post.mediaUrl || post.referenceMediaUrl) && (
                      <div className="relative h-20 w-full rounded-lg overflow-hidden bg-slate-900">
                        <img
                          src={post.finalArtMediaUrl || post.mediaUrl || post.referenceMediaUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        {post.brandName || post.clientName}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400">
                        {post.format}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2">
                      {post.title}
                    </h4>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span className="text-slate-400">{post.scheduledDate}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickChangePostStatus(post, colConfig.next);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white font-bold transition cursor-pointer text-slate-600 dark:text-slate-300"
                      >
                        Avanzar →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
