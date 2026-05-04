'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { publicApi } from '@/lib/api';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  authorName: string | null;
  tags: any;
  publishedAt: string | null;
  metaDescription: string | null;
}

// Allow http(s)/mailto/relative-path hrefs only — anything else (notably
// `javascript:` or `data:`) is a stored XSS vector. With JWT in localStorage
// a single bad blog post = full account takeover, so this list is allow-list
// not block-list.
function safeHref(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '#';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^mailto:/i.test(s))     return s;
  if (s.startsWith('/') || s.startsWith('#')) return s;
  return '#';
}

// Escape attribute values so a closing-quote can't break out of an href.
function attrEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Minimal markdown → HTML so we don't need a dep.
// Handles headings, paragraphs, bold, italic, links, lists, inline code.
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;

  const inline = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 text-emerald-700 text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) =>
      `<a href="${attrEscape(safeHref(href))}" rel="nofollow noopener" class="text-emerald-600 underline hover:text-emerald-700">${label}</a>`
    );

  for (const line of lines) {
    if (/^#{1}\s+/.test(line)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h1 class="text-3xl font-bold mt-8 mb-4 bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">${inline(line.replace(/^#\s+/, ''))}</h1>`); continue; }
    if (/^#{2}\s+/.test(line)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h2 class="text-2xl font-bold mt-6 mb-3 text-slate-900">${inline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^#{3}\s+/.test(line)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h3 class="text-xl font-bold mt-5 mb-2 text-slate-900">${inline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1 my-3 text-slate-700">'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    if (line.trim() === '') { out.push(''); continue; }
    out.push(`<p class="text-slate-700 leading-relaxed my-3">${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    publicApi.blogPost(slug)
      .then((r) => setPost(r.data))
      .catch((err) => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-6 py-20 animate-pulse">
          <div className="h-10 w-3/4 bg-slate-100 rounded mb-4" />
          <div className="h-4 w-1/3 bg-slate-100 rounded mb-10" />
          <div className="h-60 bg-slate-100 rounded-2xl mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded w-full" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !post) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">Post not found</h1>
          <p className="text-slate-500 mt-2">This article doesn't exist or was unpublished.</p>
          <Link href="/resources/blog" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700">
            <ArrowLeft size={14} /> Back to blog
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const tags: string[] = Array.isArray(post.tags) ? post.tags : (typeof post.tags === 'string' ? [post.tags] : []);

  return (
    <PublicLayout>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/resources/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-8">
          <ArrowLeft size={14} /> All posts
        </Link>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                <Tag size={10} /> {t}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent leading-tight">
          {post.title}
        </h1>

        {post.excerpt && <p className="mt-4 text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>}

        <div className="flex items-center gap-4 mt-6 pb-6 border-b border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(post.publishedAt)}</div>
          {post.authorName && <div className="flex items-center gap-1.5"><User size={12} /> {post.authorName}</div>}
        </div>

        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-2xl mt-8 border border-slate-200"
          />
        )}

        <div
          className="mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || '') }}
        />
      </article>
    </PublicLayout>
  );
}
