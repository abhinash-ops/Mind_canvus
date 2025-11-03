import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRef } from 'react';

const CreatePost = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')
  const [scheduledFor, setScheduledFor] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageInput, setFeaturedImageInput] = useState("");
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "https://mind-canvus-backend-argn.onrender.com").replace(/\/$/, '');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsLoading(true);
    try {
      const res = await api.post('/posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      let imageUrl = res.data.imageUrl;
      if (!imageUrl.startsWith('http')) {
        imageUrl = backendBaseUrl + imageUrl;
      }
      setFeaturedImageUrl(imageUrl);
      setFeaturedImageInput(""); // Clear manual input if file uploaded
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let postData = {
        ...data,
        content,
        status: data.status || 'draft',
        featuredImage: featuredImageUrl || featuredImageInput || data.featuredImage,
      };
      if (data.status === 'scheduled' && scheduledFor) {
        postData.scheduledFor = scheduledFor.toISOString();
      }
      await api.post('/posts', postData);
      toast.success('Post created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                {...register('title', { required: 'Title is required' })}
                className="input"
                placeholder="Enter post title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                {...register('category', { required: 'Category is required' })}
                className="input"
              >
                <option value="">Select category</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Education">Education</option>
                <option value="Fun">Fun</option>
                <option value="Movies">Movies</option>
                <option value="Technology">Technology</option>
                <option value="Lifestyle">Lifestyle</option>
                <option value="Travel">Travel</option>
                <option value="Food">Food</option>
                <option value="Sports">Sports</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              {...register('excerpt')}
              rows={3}
              className="input"
              placeholder="Brief description of your post (optional)"
            />
          </div>

          <div className="mt-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="input"
              placeholder="Write your post content here..."
              required
            />
          </div>

          <div className="mt-6">
            <label htmlFor="featuredImage" className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image (URL or Upload)
            </label>
            <input
              id="featuredImage"
              type="url"
              className="input mb-2"
              placeholder="https://example.com/image.jpg"
              value={featuredImageInput}
              onChange={e => {
                setFeaturedImageInput(e.target.value);
                setFeaturedImageUrl(""); // Clear file upload if user types URL
              }}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="input"
                disabled={isLoading}
              />
              {(featuredImageUrl || featuredImageInput) && (
                <div>
                  <img
                    src={featuredImageUrl || featuredImageInput}
                    alt="Preview"
                    className="h-12 w-12 object-cover rounded"
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                  />
                  <div className="text-xs text-gray-500 break-all">URL: {featuredImageUrl || featuredImageInput}</div>
                  {imageError && (
                    <div className="text-xs text-red-600">Image failed to load. Check the URL above and backend server.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="input"
              onChange={e => {
                if (e.target.value !== 'scheduled') setScheduledFor(null);
              }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          {(typeof (window) !== 'undefined' && (document.getElementById('status')?.value === 'scheduled' || scheduledFor)) && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule for (date & time)
              </label>
              <DatePicker
                selected={scheduledFor}
                onChange={date => setScheduledFor(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={1}
                dateFormat="yyyy-MM-dd HH:mm"
                minDate={new Date()}
                className="input"
                placeholderText="Select date and time"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePost
