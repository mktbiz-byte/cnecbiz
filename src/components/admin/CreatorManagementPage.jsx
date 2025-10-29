import React, { useState, useEffect } from 'react';
import { supabaseBiz } from '../../lib/supabaseClients';
import { Plus, Edit2, Trash2, RefreshCw, Youtube, ExternalLink } from 'lucide-react';
import AdminNavigation from './AdminNavigation';

const CreatorManagementPage = () => {
  const [activeTab, setActiveTab] = useState('affiliated'); // 'affiliated' or 'our_channels'
  const [creators, setCreators] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    creator_name: '',
    channel_name: '',
    channel_url: '',
    channel_id: '',
    youtube_api_key: '',
    use_api: false,
    thumbnail_url: '',
    platform: 'youtube',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseBiz.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      const endpoint = activeTab === 'affiliated' 
        ? '/.netlify/functions/manage-affiliated-creators'
        : '/.netlify/functions/manage-our-channels';

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        if (activeTab === 'affiliated') {
          setCreators(result.data);
        } else {
          setChannels(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabaseBiz.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      const endpoint = activeTab === 'affiliated'
        ? '/.netlify/functions/manage-affiliated-creators'
        : '/.netlify/functions/manage-our-channels';

      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${endpoint}?id=${editingItem.id}` : endpoint;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        alert(editingItem ? '수정되었습니다.' : '추가되었습니다.');
        setShowAddModal(false);
        setEditingItem(null);
        resetForm();
        fetchData();
      } else {
        alert(result.error || '작업에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('작업 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabaseBiz.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      const endpoint = activeTab === 'affiliated'
        ? '/.netlify/functions/manage-affiliated-creators'
        : '/.netlify/functions/manage-our-channels';

      const response = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('삭제되었습니다.');
        fetchData();
      } else {
        alert(result.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchYouTubeData = async (item) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseBiz.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('/.netlify/functions/fetch-youtube-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_url: item.channel_url,
          channel_type: activeTab === 'affiliated' ? 'affiliated_creator' : 'our_channel',
          record_id: item.id,
          youtube_api_key: item.youtube_api_key
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`데이터 갱신 완료!\n구독자: ${result.data.channel.subscriber_count.toLocaleString()}명\n영상: ${result.data.videos}개`);
        fetchData();
      } else {
        alert(result.error || '데이터 갱신에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('데이터 갱신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      creator_name: item.creator_name || '',
      channel_name: item.channel_name || '',
      channel_url: item.channel_url || '',
      channel_id: item.channel_id || '',
      youtube_api_key: item.youtube_api_key || '',
      use_api: item.use_api || false,
      thumbnail_url: item.thumbnail_url || '',
      platform: item.platform || 'youtube',
      description: item.description || '',
      notes: item.notes || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      creator_name: '',
      channel_name: '',
      channel_url: '',
      channel_id: '',
      youtube_api_key: '',
      use_api: false,
      thumbnail_url: '',
      platform: 'youtube',
      description: '',
      notes: ''
    });
  };

  const dataList = activeTab === 'affiliated' ? creators : channels;

  return (
    <>
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">크리에이터 & 채널 관리</h1>
        <p className="text-gray-600">소속 크리에이터와 우리 채널을 관리하고 YouTube 데이터를 수집하세요.</p>
      </div>

      {/* 탭 */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('affiliated')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'affiliated'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          소속 크리에이터
        </button>
        <button
          onClick={() => setActiveTab('our_channels')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'our_channels'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          우리 채널
        </button>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            setEditingItem(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          {activeTab === 'affiliated' ? '크리에이터 추가' : '채널 추가'}
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 목록 */}
      {loading && dataList.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      ) : dataList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {activeTab === 'affiliated' ? '등록된 크리에이터가 없습니다.' : '등록된 채널이 없습니다.'}
          </p>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            첫 번째 {activeTab === 'affiliated' ? '크리에이터' : '채널'} 추가하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataList.map((item) => (
            <div key={item.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.creator_name || item.channel_name}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.creator_name || item.channel_name}
              </h3>

              {item.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <ExternalLink className="w-4 h-4 mr-1" />
                <a
                  href={item.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 truncate"
                >
                  {item.channel_url}
                </a>
              </div>

              {item.notes && (
                <p className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                  {item.notes}
                </p>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  수정
                </button>

                {item.youtube_api_key && (
                  <button
                    onClick={() => handleFetchYouTubeData(item)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                등록일: {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingItem ? '수정하기' : '추가하기'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'affiliated' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      크리에이터 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.creator_name}
                      onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        채널 이름 *
                      </label>
                      <input
                        type="text"
                        value={formData.channel_name}
                        onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        채널 ID *
                      </label>
                      <input
                        type="text"
                        value={formData.channel_id}
                        onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                        required
                        placeholder="UCxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        YouTube 채널 ID (UC로 시작)
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    채널 URL *
                  </label>
                  <input
                    type="url"
                    value={formData.channel_url}
                    onChange={(e) => setFormData({ ...formData, channel_url: e.target.value })}
                    required
                    placeholder="https://www.youtube.com/@channelname"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube API 키 (선택)
                  </label>
                  <input
                    type="text"
                    value={formData.youtube_api_key}
                    onChange={(e) => setFormData({ ...formData, youtube_api_key: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    API 키를 입력하면 자동으로 데이터를 수집할 수 있습니다.
                  </p>
                </div>

                {activeTab === 'our_channels' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메모
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '처리 중...' : (editingItem ? '수정하기' : '추가하기')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default CreatorManagementPage;

