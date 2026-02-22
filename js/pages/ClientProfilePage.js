/**
 * Client Profile Page
 * Public profile page for clients at /u/{slug}
 * Shows profile info, avatar, banner, and the client's posts.
 * Owner can edit avatar, banner, name, phone, timezone, and meeting type.
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { uploadToR2 } from '../services/r2Upload.js';
import { FeedPost } from '../components/feed/FeedPost.js';
import { queryClient } from '../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../config/queryConfig.js';

const React = window.React;
const { useState, useEffect, useCallback, useRef, memo } = React;
const html = htm.bind(React.createElement);

const PAGE_SIZE = 10;

/* ─── Photo Editor Modal (reusable for avatar) ──────────────────── */
const ClientPhotoEditorModal = memo(function ClientPhotoEditorModal({ client, session, onClose, onSave }) {
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const originalStemRef = useRef('avatar');
    const CROP_SIZE = 280;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const hasExisting = client.avatar_url && !client.avatar_url.includes('ui-avatars.com');
        if (hasExisting) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { setImage(img); };
            img.src = client.avatar_url + '?t=' + Date.now();
        } else {
            setTimeout(() => fileInputRef.current?.click(), 100);
        }
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError(t('client.editPhotoImageOnly') || 'Please select an image file'); return; }
        if (file.size > 10 * 1024 * 1024) { setError(t('client.editPhotoMaxSize') || 'Image must be less than 10MB'); return; }
        originalStemRef.current = file.name.replace(/\.[^.]+$/, '') || 'avatar';
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => { setImage(img); setZoom(1); setPosition({ x: 0, y: 0 }); };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown = (e) => { if (!image) return; setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
    const handleMouseMove = (e) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchStart = (e) => { if (!image || e.touches.length !== 1) return; setIsDragging(true); setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }); };
    const handleTouchMove = (e) => { if (!isDragging || e.touches.length !== 1) return; e.preventDefault(); setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }); };
    const handleTouchEnd = () => setIsDragging(false);

    const handleApply = async () => {
        if (!image) return;
        setSaving(true);
        setError('');
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = 400; canvas.height = 400;
            ctx.fillStyle = '#f3f2ef';
            ctx.fillRect(0, 0, 400, 400);
            const containerSize = containerRef.current?.offsetWidth || CROP_SIZE;
            const scale = 400 / containerSize;
            ctx.save();
            ctx.translate(200, 200);
            ctx.scale(zoom, zoom);
            ctx.translate(-200, -200);
            const fitScale = Math.max(containerSize / image.width, containerSize / image.height);
            const sw = image.width * fitScale * scale;
            const sh = image.height * fitScale * scale;
            ctx.drawImage(image, (400 - sw) / 2 + position.x * scale, (400 - sh) / 2 + position.y * scale, sw, sh);
            ctx.restore();

            const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Blob failed')), 'image/jpeg', 0.9));
            const userId = session?.user?.id;
            if (!userId) throw new Error('Not authenticated');
            const apiBase = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

            const avatarUrl = await uploadToR2({
                apiBase,
                file: new File([blob], 'avatar.jpg', { type: 'image/jpeg' }),
                bucket: 'profile-images',
                originalName: originalStemRef.current || 'avatar',
                accessToken: session?.access_token,
            });
            await onSave({ avatar_url: avatarUrl });
            onClose();
        } catch (err) {
            console.error('Photo upload error:', err);
            setError(err.message || 'Upload failed');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="client-modal-overlay" onClick=${onClose}>
            <div class="client-modal" onClick=${(e) => e.stopPropagation()}>
                <div class="client-modal-header">
                    <h3>${t('client.editPhoto') || 'Edit Photo'}</h3>
                    <button class="client-modal-close" onClick=${onClose}>&times;</button>
                </div>
                <div class="client-modal-body" style=${{ textAlign: 'center' }}>
                    <input type="file" accept="image/*" ref=${fileInputRef} onChange=${handleFileSelect} style=${{ display: 'none' }} />
                    ${image ? html`
                        <div class="client-photo-crop-container" ref=${containerRef}
                            onMouseDown=${handleMouseDown} onMouseMove=${handleMouseMove} onMouseUp=${handleMouseUp} onMouseLeave=${handleMouseUp}
                            onTouchStart=${handleTouchStart} onTouchMove=${handleTouchMove} onTouchEnd=${handleTouchEnd}
                            style=${{ width: CROP_SIZE + 'px', height: CROP_SIZE + 'px', margin: '0 auto', overflow: 'hidden', borderRadius: '50%', position: 'relative', cursor: 'grab', background: '#f3f2ef', touchAction: 'none' }}>
                            <img src=${image.src} style=${{
                                position: 'absolute',
                                width: Math.max(CROP_SIZE, image.width * Math.max(CROP_SIZE / image.width, CROP_SIZE / image.height)) * zoom + 'px',
                                height: 'auto',
                                left: '50%', top: '50%',
                                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                                pointerEvents: 'none', userSelect: 'none'
                            }} />
                        </div>
                        <div style=${{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span style=${{ fontSize: '0.8rem' }}>-</span>
                            <input type="range" min="0.5" max="3" step="0.05" value=${zoom} onInput=${(e) => setZoom(parseFloat(e.target.value))} style=${{ width: '180px' }} />
                            <span style=${{ fontSize: '0.8rem' }}>+</span>
                        </div>
                    ` : html`
                        <div style=${{ padding: '40px', color: '#9ca3af' }}>
                            <p>${t('client.editPhotoSelect') || 'Select a photo to upload'}</p>
                            <button class="client-btn-primary" onClick=${() => fileInputRef.current?.click()}>
                                ${t('client.editPhotoChoose') || 'Choose Photo'}
                            </button>
                        </div>
                    `}
                    ${error && html`<p style=${{ color: '#ef4444', fontSize: '0.82rem', marginTop: '8px' }}>${error}</p>`}
                </div>
                <canvas ref=${canvasRef} style=${{ display: 'none' }} />
                <div class="client-modal-footer">
                    ${image && html`<button class="client-btn-secondary" onClick=${() => fileInputRef.current?.click()}>${t('client.editPhotoChange') || 'Change Photo'}</button>`}
                    <button class="client-btn-primary" onClick=${handleApply} disabled=${!image || saving}>
                        ${saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                    </button>
                </div>
            </div>
        </div>
    `;
});

/* ─── Banner Editor Modal ───────────────────────────────────────── */
const ClientBannerEditorModal = memo(function ClientBannerEditorModal({ client, session, onClose, onSave }) {
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const originalStemRef = useRef('banner');
    const BANNER_W = 600; const BANNER_H = 150;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        if (client.banner_url) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => setImage(img);
            img.src = client.banner_url + '?t=' + Date.now();
        } else {
            setTimeout(() => fileInputRef.current?.click(), 100);
        }
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError(t('client.editPhotoImageOnly') || 'Please select an image file'); return; }
        originalStemRef.current = file.name.replace(/\.[^.]+$/, '') || 'banner';
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => { setImage(img); setZoom(1); setPosition({ x: 0, y: 0 }); };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown = (e) => { if (!image) return; setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
    const handleMouseMove = (e) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchStart = (e) => { if (!image || e.touches.length !== 1) return; setIsDragging(true); setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }); };
    const handleTouchMove = (e) => { if (!isDragging || e.touches.length !== 1) return; e.preventDefault(); setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }); };
    const handleTouchEnd = () => setIsDragging(false);

    const handleApply = async () => {
        if (!image) return;
        setSaving(true);
        setError('');
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = 1200; canvas.height = 300;
            ctx.fillStyle = '#006266';
            ctx.fillRect(0, 0, 1200, 300);
            const cw = containerRef.current?.offsetWidth || BANNER_W;
            const ch = containerRef.current?.offsetHeight || BANNER_H;
            const sx = 1200 / cw; const sy = 300 / ch;
            ctx.save();
            ctx.translate(600, 150);
            ctx.scale(zoom, zoom);
            ctx.translate(-600, -150);
            const fitScale = Math.max(cw / image.width, ch / image.height);
            const sw = image.width * fitScale * sx;
            const sh = image.height * fitScale * sy;
            ctx.drawImage(image, (1200 - sw) / 2 + position.x * sx, (300 - sh) / 2 + position.y * sy, sw, sh);
            ctx.restore();

            const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Blob failed')), 'image/jpeg', 0.85));
            const userId = session?.user?.id;
            if (!userId) throw new Error('Not authenticated');
            const apiBase = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

            const formData = new FormData();
            formData.append('file', new File([blob], 'banner.jpg', { type: 'image/jpeg' }));
            formData.append('bucket', 'profile-banners');
            formData.append('original_name', originalStemRef.current || 'banner');

            const token = session?.access_token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const uploadRes = await fetch(`${apiBase}/upload`, { method: 'POST', headers, body: formData });
            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadJson.error?.message || uploadJson.error || 'Upload failed');

            await onSave({ banner_url: uploadJson.data?.url || uploadJson.url });
            onClose();
        } catch (err) {
            console.error('Banner upload error:', err);
            setError(err.message || 'Upload failed');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="client-modal-overlay" onClick=${onClose}>
            <div class="client-modal client-modal-wide" onClick=${(e) => e.stopPropagation()}>
                <div class="client-modal-header">
                    <h3>${t('client.editBanner') || 'Edit Banner'}</h3>
                    <button class="client-modal-close" onClick=${onClose}>&times;</button>
                </div>
                <div class="client-modal-body" style=${{ textAlign: 'center' }}>
                    <input type="file" accept="image/*" ref=${fileInputRef} onChange=${handleFileSelect} style=${{ display: 'none' }} />
                    ${image ? html`
                        <div class="client-banner-crop-container" ref=${containerRef}
                            onMouseDown=${handleMouseDown} onMouseMove=${handleMouseMove} onMouseUp=${handleMouseUp} onMouseLeave=${handleMouseUp}
                            onTouchStart=${handleTouchStart} onTouchMove=${handleTouchMove} onTouchEnd=${handleTouchEnd}
                            style=${{ width: '100%', maxWidth: BANNER_W + 'px', height: BANNER_H + 'px', margin: '0 auto', overflow: 'hidden', borderRadius: '8px', position: 'relative', cursor: 'grab', background: '#006266', touchAction: 'none' }}>
                            <img src=${image.src} style=${{
                                position: 'absolute',
                                width: Math.max(BANNER_W, image.width * Math.max(BANNER_W / image.width, BANNER_H / image.height)) * zoom + 'px',
                                height: 'auto',
                                left: '50%', top: '50%',
                                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                                pointerEvents: 'none', userSelect: 'none'
                            }} />
                        </div>
                        <div style=${{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span style=${{ fontSize: '0.8rem' }}>-</span>
                            <input type="range" min="0.5" max="3" step="0.05" value=${zoom} onInput=${(e) => setZoom(parseFloat(e.target.value))} style=${{ width: '200px' }} />
                            <span style=${{ fontSize: '0.8rem' }}>+</span>
                        </div>
                    ` : html`
                        <div style=${{ padding: '40px', color: '#9ca3af' }}>
                            <p>${t('client.editBannerSelect') || 'Select an image for your banner'}</p>
                            <button class="client-btn-primary" onClick=${() => fileInputRef.current?.click()}>
                                ${t('client.editPhotoChoose') || 'Choose Photo'}
                            </button>
                        </div>
                    `}
                    ${error && html`<p style=${{ color: '#ef4444', fontSize: '0.82rem', marginTop: '8px' }}>${error}</p>`}
                </div>
                <canvas ref=${canvasRef} style=${{ display: 'none' }} />
                <div class="client-modal-footer">
                    ${image && html`<button class="client-btn-secondary" onClick=${() => fileInputRef.current?.click()}>${t('client.editPhotoChange') || 'Change Photo'}</button>`}
                    <button class="client-btn-primary" onClick=${handleApply} disabled=${!image || saving}>
                        ${saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                    </button>
                </div>
            </div>
        </div>
    `;
});

/* ─── Profile Info Editor Modal ─────────────────────────────────── */
const ClientProfileEditorModal = memo(function ClientProfileEditorModal({ client, onClose, onSave }) {
    const [fullName, setFullName] = useState(client.full_name || '');
    const [phone, setPhone] = useState(client.phone || '');
    const [timezone, setTimezone] = useState(client.timezone || '');
    const [meetingType, setMeetingType] = useState(client.preferred_meeting_type || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) { setError(t('client.editNameRequired') || 'Name is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({
                full_name: fullName.trim(),
                phone: phone.trim() || null,
                timezone: timezone.trim() || null,
                preferred_meeting_type: meetingType || null,
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const MEETING_TYPES = [
        { value: '', label: t('client.editMeetingNone') || 'No preference' },
        { value: 'online', label: t('client.editMeetingOnline') || 'Online' },
        { value: 'in-person', label: t('client.editMeetingInPerson') || 'In person' },
        { value: 'both', label: t('client.editMeetingBoth') || 'Both' },
    ];

    const COMMON_TIMEZONES = [
        '', 'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Europe/Madrid',
        'Europe/Rome', 'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Vienna',
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney',
    ];

    return html`
        <div class="client-modal-overlay" onClick=${onClose}>
            <div class="client-modal" onClick=${(e) => e.stopPropagation()}>
                <div class="client-modal-header">
                    <h3>${t('client.editProfile') || 'Edit Profile'}</h3>
                    <button class="client-modal-close" onClick=${onClose}>&times;</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="client-modal-body">
                        <div class="client-form-group">
                            <label class="client-form-label">${t('client.editName') || 'Full Name'} *</label>
                            <input type="text" class="client-form-input" value=${fullName} onInput=${(e) => setFullName(e.target.value)} required />
                        </div>
                        <div class="client-form-group">
                            <label class="client-form-label">${t('client.editPhone') || 'Phone'}</label>
                            <input type="tel" class="client-form-input" value=${phone} onInput=${(e) => setPhone(e.target.value)} placeholder="+49 ..." />
                        </div>
                        <div class="client-form-group">
                            <label class="client-form-label">${t('client.editTimezone') || 'Timezone'}</label>
                            <select class="client-form-input" value=${timezone} onChange=${(e) => setTimezone(e.target.value)}>
                                ${COMMON_TIMEZONES.map(tz => html`<option key=${tz} value=${tz}>${tz || (t('client.editTimezoneNone') || 'Select timezone...')}</option>`)}
                            </select>
                        </div>
                        <div class="client-form-group">
                            <label class="client-form-label">${t('client.editMeetingType') || 'Preferred Meeting Type'}</label>
                            <select class="client-form-input" value=${meetingType} onChange=${(e) => setMeetingType(e.target.value)}>
                                ${MEETING_TYPES.map(mt => html`<option key=${mt.value} value=${mt.value}>${mt.label}</option>`)}
                            </select>
                        </div>
                        ${error && html`<p style=${{ color: '#ef4444', fontSize: '0.82rem', marginTop: '8px' }}>${error}</p>`}
                    </div>
                    <div class="client-modal-footer">
                        <button type="button" class="client-btn-secondary" onClick=${onClose}>${t('common.cancel') || 'Cancel'}</button>
                        <button type="submit" class="client-btn-primary" disabled=${saving}>
                            ${saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/* ─── Main ClientProfilePage ────────────────────────────────────── */
export function ClientProfilePage({ clientSlug, session }) {
    const [client, setClient] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [activityPage, setActivityPage] = useState(0);
    const [error, setError] = useState(null);

    // Edit modals
    const [showPhotoEditor, setShowPhotoEditor] = useState(false);
    const [showBannerEditor, setShowBannerEditor] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);

    const loadClient = useCallback(async () => {
        const supabase = window.supabaseClient;
        if (!supabase || !clientSlug) return;

        setLoading(true);
        setError(null);

        try {
            const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.clientBySlug(clientSlug),
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('cs_clients')
                        .select('*')
                        .eq('slug', clientSlug)
                        .single();
                    if (error) throw error;
                    return data;
                },
                staleTime: STALE_TIMES.clientProfile,
            });

            setClient(data);
        } catch (err) {
            console.error('Failed to load client:', err);
            setError('Profile not found');
        } finally {
            setLoading(false);
        }
    }, [clientSlug]);

    const loadActivity = useCallback(async (page = 0) => {
        if (!client?.user_id) return;
        const supabase = window.supabaseClient;
        if (!supabase) return;

        setActivityLoading(true);
        try {
            const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.clientPosts(client.user_id, page),
                queryFn: async () => {
                    const userId = client.user_id;

                    // Fetch all activity types in parallel
                    const [ownPostsRes, likesRes, repostsRes, commentsRes] = await Promise.all([
                        // Own posts
                        supabase
                            .from('cs_posts')
                            .select('*')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
                        // Liked posts — get like records with post data
                        supabase
                            .from('cs_post_likes')
                            .select('post_id, created_at, cs_posts(*)')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
                        // Reposted posts
                        supabase
                            .from('cs_post_reposts')
                            .select('post_id, reposted_at, cs_posts(*)')
                            .eq('user_id', userId)
                            .order('reposted_at', { ascending: false })
                            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
                        // Commented posts — get distinct posts commented on
                        supabase
                            .from('cs_post_comments')
                            .select('id, post_id, content, author_name, author_avatar, created_at, cs_posts(*)')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .range(page * PAGE_SIZE * 2, (page + 1) * PAGE_SIZE * 2 - 1),
                    ]);

                    // Build activity items with type labels
                    // Priority: posted > reposted > commented > liked
                    // If a post has multiple interactions, only show the highest priority one
                    const activityByPost = new Map();
                    const PRIORITY = { posted: 4, reposted: 3, commented: 2, liked: 1 };

                    const addActivity = (postId, post, activityType, activityTime, extra) => {
                        if (!post) return;
                        const existing = activityByPost.get(postId);
                        if (!existing || PRIORITY[activityType] > PRIORITY[existing.activityType]) {
                            activityByPost.set(postId, { post, activityType, activityTime, ...extra });
                        } else if (existing && PRIORITY[activityType] === PRIORITY[existing.activityType]) {
                            // Same priority — keep the most recent time
                            if (new Date(activityTime) > new Date(existing.activityTime)) {
                                existing.activityTime = activityTime;
                            }
                            if (extra) Object.assign(existing, extra);
                        }
                    };

                    // Own posts
                    (ownPostsRes.data || []).forEach(post => {
                        addActivity(post.id, post, 'posted', post.created_at);
                    });

                    // Reposts
                    (repostsRes.data || []).forEach(repost => {
                        if (repost.cs_posts) {
                            addActivity(repost.post_id, repost.cs_posts, 'reposted', repost.reposted_at);
                        }
                    });

                    // Comments (deduplicate by post_id — use latest comment, store user comment data)
                    const commentsByPost = new Map();
                    (commentsRes.data || []).forEach(comment => {
                        if (comment.cs_posts) {
                            const existing = commentsByPost.get(comment.post_id);
                            if (!existing || new Date(comment.created_at) > new Date(existing.created_at)) {
                                commentsByPost.set(comment.post_id, {
                                    id: comment.id,
                                    content: comment.content,
                                    author_name: comment.author_name,
                                    author_avatar: comment.author_avatar,
                                    created_at: comment.created_at,
                                });
                            }
                            addActivity(comment.post_id, comment.cs_posts, 'commented', commentsByPost.get(comment.post_id).created_at, {
                                userComment: commentsByPost.get(comment.post_id),
                            });
                        }
                    });

                    // Likes
                    (likesRes.data || []).forEach(like => {
                        if (like.cs_posts) {
                            addActivity(like.post_id, like.cs_posts, 'liked', like.created_at);
                        }
                    });

                    const activityItems = Array.from(activityByPost.values());

                    // Sort by activity time (most recent first)
                    activityItems.sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime));

                    // Trim to page size
                    return activityItems.slice(0, PAGE_SIZE);
                },
                staleTime: STALE_TIMES.clientPosts,
            });

            // Enrich posts with current user's interaction status
            if (data.length > 0 && session?.user?.id) {
                const postIds = data.map(a => a.post.id);
                const [uLikes, uHighlights, uReposts] = await Promise.all([
                    supabase.from('cs_post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_highlights').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_reposts').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                ]);
                const likedSet = new Set((uLikes.data || []).map(l => l.post_id));
                const highlightedSet = new Set((uHighlights.data || []).map(h => h.post_id));
                const repostedSet = new Set((uReposts.data || []).map(r => r.post_id));
                data.forEach(a => {
                    a.post._userLiked = likedSet.has(a.post.id);
                    a.post._userHighlighted = highlightedSet.has(a.post.id);
                    a.post._userReposted = repostedSet.has(a.post.id);
                });
            }

            if (page === 0) {
                setActivities(data);
            } else {
                setActivities(prev => [...prev, ...data]);
            }
            setHasMore(data.length >= PAGE_SIZE);
            setActivityPage(page);
        } catch (err) {
            console.error('Failed to load activity:', err);
        } finally {
            setActivityLoading(false);
        }
    }, [client, session]);

    // Save client profile changes
    const saveClientProfile = useCallback(async (updateData) => {
        if (!client?.id || !session?.user?.id) throw new Error('Not authenticated');
        if (session.user.id !== client.user_id) throw new Error('You can only edit your own profile');

        const { data, error } = await window.supabaseClient
            .from('cs_clients')
            .update(updateData)
            .eq('id', client.id)
            .eq('user_id', session.user.id)
            .select()
            .single();

        if (error) throw error;
        setClient(prev => ({ ...prev, ...data }));
        queryClient.invalidateQueries({ queryKey: ['client'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        return data;
    }, [client, session]);

    useEffect(() => {
        loadClient();
    }, [loadClient]);

    useEffect(() => {
        if (client) loadActivity(0);
    }, [client, loadActivity]);

    if (loading) {
        return html`
            <div class="client-profile-loading">
                <div class="feed-loading-spinner"></div>
                <p>${t('common.loading') || 'Loading...'}</p>
            </div>
        `;
    }

    if (error || !client) {
        return html`
            <div class="client-profile-error">
                <h2>${t('client.profileNotFound') || 'Profile not found'}</h2>
                <p>${t('client.profileNotFoundDesc') || 'This profile does not exist or has been removed.'}</p>
                <a href="/feed" class="btn-back-feed">${t('client.backToFeed') || 'Back to Feed'}</a>
            </div>
        `;
    }

    const displayName = client.full_name || 'User';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=006266&color=fff&size=128`;
    const isOwnProfile = session?.user?.id === client.user_id;

    return html`
        <div class="client-profile-page">
            <div class="client-profile-container">
                <!-- Profile Header -->
                <div class="client-profile-card">
                    <div class="client-profile-banner" style=${client.banner_url ? { backgroundImage: `url(${client.banner_url})` } : {}}>
                        ${isOwnProfile && html`
                            <button class="client-btn-edit-banner" onClick=${() => setShowBannerEditor(true)} title=${t('client.editBanner') || 'Edit banner'}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        `}
                    </div>
                    <div class="client-profile-header-content">
                        <div class="client-profile-avatar-wrapper">
                            <img
                                src=${avatarUrl}
                                alt=${displayName}
                                class="client-profile-avatar"
                            />
                            ${isOwnProfile && html`
                                <button class="client-btn-edit-photo" onClick=${() => setShowPhotoEditor(true)} title=${t('client.editPhoto') || 'Edit photo'}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                </button>
                            `}
                        </div>
                        <div class="client-profile-info">
                            <div class="client-profile-name-row">
                                <h1 class="client-profile-name">${displayName}</h1>
                                ${isOwnProfile && html`
                                    <button class="client-btn-edit-inline" onClick=${() => setShowProfileEditor(true)} title=${t('client.editProfile') || 'Edit profile'}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                `}
                            </div>
                            ${client.phone && html`
                                <p class="client-profile-detail">${client.phone}</p>
                            `}
                            ${client.timezone && html`
                                <p class="client-profile-detail">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ verticalAlign: 'middle', marginRight: '4px' }}>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    ${client.timezone}
                                </p>
                            `}
                            ${client.preferred_meeting_type && html`
                                <p class="client-profile-detail">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ verticalAlign: 'middle', marginRight: '4px' }}>
                                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                    </svg>
                                    ${client.preferred_meeting_type === 'online' ? (t('client.editMeetingOnline') || 'Online')
                                        : client.preferred_meeting_type === 'in-person' ? (t('client.editMeetingInPerson') || 'In person')
                                        : client.preferred_meeting_type === 'both' ? (t('client.editMeetingBoth') || 'Both')
                                        : client.preferred_meeting_type}
                                </p>
                            `}
                            <p class="client-profile-member-since">
                                ${t('client.memberSince') || 'Member since'} ${new Date(client.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Activity Section -->
                <div class="client-profile-posts-section">
                    <h3 class="client-profile-section-title">
                        ${t('client.activity') || 'Activity'}
                        ${activities.length > 0 ? ` (${activities.length}${hasMore ? '+' : ''})` : ''}
                    </h3>

                    ${activities.length === 0 && !activityLoading ? html`
                        <div class="client-profile-no-posts">
                            <p>${isOwnProfile
                                ? (t('client.noActivityOwn') || 'No activity yet. Like, comment, or share posts on the feed!')
                                : (t('client.noActivity') || 'No activity yet.')}</p>
                        </div>
                    ` : html`
                        <div class="client-profile-posts-list">
                            ${activities.map((item) => {
                                const { post, activityType, userComment } = item;
                                return html`
                                <div key=${post.id + '-' + activityType} class="client-activity-item">
                                    ${activityType !== 'posted' && html`
                                        <div class="client-activity-label client-activity-${activityType}">
                                            ${activityType === 'liked' && html`
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                            `}
                                            ${activityType === 'reposted' && html`
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                                            `}
                                            ${activityType === 'commented' && html`
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            `}
                                            <span>${activityType === 'liked' ? (t('client.activityLiked') || 'Liked')
                                                : activityType === 'reposted' ? (t('client.activityReposted') || 'Reposted')
                                                : (t('client.activityCommented') || 'Commented on')}</span>
                                        </div>
                                    `}
                                    <${FeedPost} post=${post} session=${session} />
                                    ${activityType === 'commented' && userComment && html`
                                        <div class="feed-comments-section" style=${{ borderTop: '1px solid #f0f0f0' }}>
                                            <div class="feed-comments-list">
                                                <div class="feed-comment">
                                                    <img
                                                        src=${userComment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userComment.author_name || 'User')}&background=006266&color=fff&size=32`}
                                                        alt=${userComment.author_name}
                                                        class="feed-comment-avatar"
                                                    />
                                                    <div class="feed-comment-body">
                                                        <div class="feed-comment-bubble">
                                                            <span class="feed-comment-author">${userComment.author_name || 'User'}</span>
                                                            <span class="feed-comment-text">${userComment.content}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `}
                                </div>
                            `; })}
                        </div>
                    `}

                    ${activityLoading && html`
                        <div class="client-profile-posts-loading">
                            <div class="feed-loading-spinner"></div>
                        </div>
                    `}

                    ${hasMore && activities.length > 0 && !activityLoading && html`
                        <button class="btn-show-more-posts" onClick=${() => loadActivity(activityPage + 1)}>
                            ${t('client.loadMoreActivity') || 'Load more activity'}
                        </button>
                    `}
                </div>
            </div>

            <!-- Edit Modals (only for own profile) -->
            ${showPhotoEditor && isOwnProfile && html`
                <${ClientPhotoEditorModal}
                    client=${client}
                    session=${session}
                    onClose=${() => setShowPhotoEditor(false)}
                    onSave=${saveClientProfile}
                />
            `}
            ${showBannerEditor && isOwnProfile && html`
                <${ClientBannerEditorModal}
                    client=${client}
                    session=${session}
                    onClose=${() => setShowBannerEditor(false)}
                    onSave=${saveClientProfile}
                />
            `}
            ${showProfileEditor && isOwnProfile && html`
                <${ClientProfileEditorModal}
                    client=${client}
                    onClose=${() => setShowProfileEditor(false)}
                    onSave=${saveClientProfile}
                />
            `}
        </div>
    `;
}

export default ClientProfilePage;
