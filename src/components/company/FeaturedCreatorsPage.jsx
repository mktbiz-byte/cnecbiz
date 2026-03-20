import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients';
import styled from 'styled-components';
import { Instagram, Youtube, TrendingUp, Users, Eye, CheckCircle, Circle, Send, Music, Sparkles } from 'lucide-react';

// SNS URL 정규화 함수
const normalizeSnsUrl = (url, platform) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const handle = url.replace(/^@/, '').trim();
  if (!handle) return null;

  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${handle}`;
    case 'youtube':
      return `https://www.youtube.com/@${handle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
    default:
      return url;
  }
};
const FeaturedCreatorsPage = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    companyName: '',
    brandName: ''
  });
  const [sending, setSending] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedCreatorForInvite, setSelectedCreatorForInvite] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    companyName: '',
    campaignId: '', // 선택한 캠페인 ID
    campaignName: '',
    packageType: '',
    rewardAmount: '',
    deadline: ''
  });
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const CATEGORY_FILTERS = [
    { id: 'all', name: '전체' },
    { id: 'skincare', name: '🧴 스킨케어' },
    { id: 'makeup', name: '💄 색조' },
    { id: 'diet', name: '🏃 다이어트' },
    { id: 'haircare', name: '💇 헤어케어' },
    { id: 'fashion', name: '👗 패션' },
    { id: 'lifestyle', name: '🏠 라이프' },
    { id: 'food', name: '🍳 먹방/요리' },
    { id: 'family', name: '👨‍👩‍👧 가족' },
    { id: 'pet', name: '🐶 반려동물' },
    { id: 'travel', name: '✈️ 여행' },
    { id: 'tech', name: '📱 테크' },
    { id: 'game', name: '🎮 게임' }
  ];

  const filteredCreators = categoryFilter === 'all'
    ? creators
    : creators.filter(c => {
        const cats = c.final_categories || c.ai_generated_categories || c.categories || [];
        return cats.some(cat => cat?.toLowerCase().includes(categoryFilter));
      });

  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creator_applications')
        .select(`
          *,
          user_profiles!featured_creator_applications_user_id_fkey (
            rating,
            company_review
          )
        `)
        .eq('status', 'approved')
        .eq('country', 'korea')
        .order('approved_at', { ascending: false });

      if (error) throw error;
      
      // Flatten user_profiles data
      const flattenedData = (data || []).map(creator => ({
        ...creator,
        rating: creator.user_profiles?.rating || 0,
        company_review: creator.user_profiles?.company_review || ''
      }));
      
      setCreators(flattenedData);
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('크리에이터 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCreatorSelection = (creator) => {
    setSelectedCreators(prev => {
      const isSelected = prev.some(c => c.id === creator.id);
      if (isSelected) {
        return prev.filter(c => c.id !== creator.id);
      } else {
        return [...prev, creator];
      }
    });
  };

  const handleOpenCampaignModal = async (creator) => {
    setSelectedCreatorForInvite(creator);
    setShowCampaignModal(true);
    await fetchUserCampaigns();
  };

  const fetchUserCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser();
      if (!user) return;

      // 한국 지역 캠페인 가져오기
      const koreaClient = supabaseKorea || supabaseBiz;
      const { data: koreaCampaigns } = await koreaClient
        .from('campaigns')
        .select('id, title, package_type, campaign_type, region, recruitment_deadline, total_slots')
        .eq('company_email', user.email)
        .eq('is_cancelled', false)
        .in('approval_status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      // 일본 지역 캠페인 가져오기
      const supabaseJapan = getSupabaseClient('japan');
      let japanCampaigns = [];
      if (supabaseJapan) {
        const { data } = await supabaseJapan
          .from('campaigns')
          .select('id, title, package_type, campaign_type, region, recruitment_deadline, total_slots')
          .eq('company_email', user.email)
          .eq('is_cancelled', false)
          .in('approval_status', ['pending', 'approved'])
          .order('created_at', { ascending: false });
        japanCampaigns = data || [];
      }

      const koreaCampaignsWithRegion = (koreaCampaigns || []).map(c => ({ ...c, region: 'korea' }));
      const japanCampaignsWithRegion = (japanCampaigns || []).map(c => ({ ...c, region: 'japan' }));

      setUserCampaigns([...koreaCampaignsWithRegion, ...japanCampaignsWithRegion]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleCampaignInvite = async () => {
    if (!campaignForm.companyName || !campaignForm.campaignName || !campaignForm.packageType || !campaignForm.rewardAmount || !campaignForm.deadline) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (!selectedCreatorForInvite) {
      alert('크리에이터 정보가 없습니다.');
      return;
    }

    // 크리에이터 전화번호 추출
    const creatorPhone = selectedCreatorForInvite.phone || selectedCreatorForInvite.user_profiles?.phone;
    if (!creatorPhone) {
      alert('크리에이터의 전화번호가 등록되어 있지 않습니다.');
      return;
    }

    // 캠페인 링크 생성
    const campaignLink = campaignForm.campaignId 
      ? `https://cnec.co.kr/campaign-application?campaign_id=${campaignForm.campaignId}`
      : 'https://cnec.co.kr';

    setSending(true);
    try {
      const response = await fetch('/.netlify/functions/send-kakao-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverNum: creatorPhone,
          receiverName: selectedCreatorForInvite.nickname || selectedCreatorForInvite.creator_name || selectedCreatorForInvite.name,
          templateCode: '025110001005',
          variables: {
            '크리에이터명': selectedCreatorForInvite.nickname || selectedCreatorForInvite.creator_name || selectedCreatorForInvite.name,
            '기업명': campaignForm.companyName,
            '캠페인명': campaignForm.campaignName,
            '패키지': campaignForm.packageType,
            '보상금': campaignForm.rewardAmount,
            '마감일': campaignForm.deadline,
            '캠페인링크': campaignLink
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('캠페인 초대 알림톡이 발송되었습니다!');
        setShowCampaignModal(false);
        setCampaignForm({
          companyName: '',
          campaignId: '',
          campaignName: '',
          packageType: '',
          rewardAmount: '',
          deadline: ''
        });
        setSelectedCreatorForInvite(null);
      } else {
        throw new Error(result.error || '알림톡 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error sending campaign invitation:', error);
      alert(error.message || '알림톡 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleInquirySubmit = async () => {
    if (!inquiryForm.companyName || !inquiryForm.brandName) {
      alert('기업명과 브랜드명을 모두 입력해주세요.');
      return;
    }

    if (selectedCreators.length === 0) {
      alert('크리에이터를 선택해주세요.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creators: selectedCreators,
          companyName: inquiryForm.companyName,
          brandName: inquiryForm.brandName,
          channelId: 'b9387420-7c8d-e703-0f96-dbfc72565bb5'
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('문의가 성공적으로 전송되었습니다!');
        setShowInquiryModal(false);
        setSelectedCreators([]);
        setInquiryForm({ companyName: '', brandName: '' });
      } else {
        throw new Error(result.error || '문의 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      alert(error.message || '문의 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const getPlatformIcon = (creator) => {
    if (creator.youtube_url) return <Youtube size={20} />;
    if (creator.instagram_url) return <Instagram size={20} />;
    return <TrendingUp size={20} />;
  };

  const getPlatformUrl = (creator) => {
    return creator.youtube_url || creator.instagram_url || creator.tiktok_url || creator.other_sns_url;
  };

  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>크리에이터 목록을 불러오는 중...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>✨ 추천 크리에이터</Title>
        <Subtitle>CNEC에서 엄선한 검증된 크리에이터들과 함께하세요</Subtitle>
      </Header>

      {selectedCreators.length > 0 && (
        <SelectionBar>
          <SelectionInfo>
            {selectedCreators.length}명의 크리에이터 선택됨
          </SelectionInfo>
          <InquiryButton onClick={() => setShowInquiryModal(true)}>
            <Send size={18} />
            선택한 크리에이터와 작업 문의하기
          </InquiryButton>
        </SelectionBar>
      )}

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', padding: '0 4px' }}>
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '13px',
              fontWeight: categoryFilter === cat.id ? '600' : '400',
              backgroundColor: categoryFilter === cat.id ? '#6C5CE7' : '#f3f4f6',
              color: categoryFilter === cat.id ? '#fff' : '#4b5563',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <CreatorsGrid>
        {filteredCreators.map((creator) => {
          const isSelected = selectedCreators.some(c => c.id === creator.id);
          return (
            <CreatorCard key={creator.id} isSelected={isSelected}>
              <SelectCheckbox onClick={() => toggleCreatorSelection(creator)}>
                {isSelected ? <CheckCircle size={24} color="#6366f1" /> : <Circle size={24} color="#ccc" />}
              </SelectCheckbox>

              <ProfileSection>
                {creator.profile_image_url && (
                  <ProfileImage src={creator.profile_image_url} alt={creator.name} />
                )}
                <CreatorInfo>
                  <CreatorName>{creator.nickname || creator.creator_name || creator.name}</CreatorName>
                  <ChannelHandle>@{creator.nickname || creator.creator_name}</ChannelHandle>
                </CreatorInfo>
              </ProfileSection>

              <StatsSection>
                <StatItem>
                  <Users size={16} />
                  <StatLabel>팔로워</StatLabel>
                  <StatValue>{formatFollowers(creator.total_followers)}</StatValue>
                </StatItem>
                <StatItem>
                  <TrendingUp size={16} />
                  <StatLabel>참여율</StatLabel>
                  <StatValue>{creator.avg_engagement_rate || 'N/A'}%</StatValue>
                </StatItem>
                <StatItem>
                  <Eye size={16} />
                  <StatLabel>평균 조회수</StatLabel>
                  <StatValue>{formatFollowers(creator.avg_views)}</StatValue>
                </StatItem>
                {creator.rating > 0 && (
                  <StatItem>
                    <span style={{ color: '#fbbf24' }}>⭐</span>
                    <StatLabel>평점</StatLabel>
                    <StatValue>{creator.rating.toFixed(1)}</StatValue>
                  </StatItem>
                )}
              </StatsSection>

              <CategoryTags>
                {(creator.final_categories || creator.ai_generated_categories || creator.categories || []).map((cat, idx) => (
                  <CategoryTag key={idx}>{cat}</CategoryTag>
                ))}
              </CategoryTags>

              {creator.additional_fee > 0 && (
                <AdditionalFeeBox>
                  <AdditionalFeeLabel>추가 비용</AdditionalFeeLabel>
                  <AdditionalFeeAmount>{creator.additional_fee.toLocaleString()}원</AdditionalFeeAmount>
                  {creator.additional_fee_description && (
                    <AdditionalFeeDesc>{creator.additional_fee_description}</AdditionalFeeDesc>
                  )}
                </AdditionalFeeBox>
              )}

              <ActionButtons>
                <ViewProfileButton onClick={() => navigate(`/featured-creators/${creator.id}`)}>
                  프로필 보기
                </ViewProfileButton>
                <AIProfileButton onClick={() => navigate(`/company/creators/${creator.id}/profile`)}>
                  <Sparkles size={16} />
                  AI 프로필
                </AIProfileButton>
                <CampaignInviteButton onClick={() => handleOpenCampaignModal(creator)}>
                  <Send size={16} />
                  캠페인 지원 요청
                </CampaignInviteButton>
                {normalizeSnsUrl(creator.youtube_url, 'youtube') && (
                  <PlatformButton href={normalizeSnsUrl(creator.youtube_url, 'youtube')} target="_blank" rel="noopener noreferrer">
                    <Youtube size={16} />
                    YouTube
                  </PlatformButton>
                )}
                {normalizeSnsUrl(creator.instagram_url, 'instagram') && (
                  <PlatformButton href={normalizeSnsUrl(creator.instagram_url, 'instagram')} target="_blank" rel="noopener noreferrer">
                    <Instagram size={16} />
                    Instagram
                  </PlatformButton>
                )}
                {normalizeSnsUrl(creator.tiktok_url, 'tiktok') && (
                  <PlatformButton href={normalizeSnsUrl(creator.tiktok_url, 'tiktok')} target="_blank" rel="noopener noreferrer">
                    <Music size={16} />
                    TikTok
                  </PlatformButton>
                )}
              </ActionButtons>
            </CreatorCard>
          );
        })}
      </CreatorsGrid>

      {creators.length === 0 && (
        <EmptyState>
          <EmptyIcon>🎬</EmptyIcon>
          <EmptyText>아직 등록된 추천 크리에이터가 없습니다.</EmptyText>
        </EmptyState>
      )}

      {showCampaignModal && (
        <ModalOverlay onClick={() => setShowCampaignModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>캠페인 지원 요청</ModalTitle>
              <CloseButton onClick={() => setShowCampaignModal(false)}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              {selectedCreatorForInvite && (
                <SelectedCreatorsList>
                  <ListTitle>선택한 크리에이터</ListTitle>
                  <SelectedCreatorItem>
                    {selectedCreatorForInvite.profile_image_url && (
                      <SmallProfileImage src={selectedCreatorForInvite.profile_image_url} alt={selectedCreatorForInvite.name} />
                    )}
                    <span>{selectedCreatorForInvite.nickname || selectedCreatorForInvite.creator_name} (@{selectedCreatorForInvite.nickname || selectedCreatorForInvite.creator_name})</span>
                  </SelectedCreatorItem>
                </SelectedCreatorsList>
              )}

              <FormGroup>
                <Label>기업명 *</Label>
                <Input
                  type="text"
                  placeholder="기업명을 입력하세요"
                  value={campaignForm.companyName}
                  onChange={(e) => setCampaignForm({ ...campaignForm, companyName: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>캠페인 선택 (선택사항)</Label>
                {loadingCampaigns ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>캠페인 목록 불러오는 중...</div>
                ) : userCampaigns.length > 0 ? (
                  <select
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    value={campaignForm.campaignId}
                    onChange={(e) => {
                      const selectedCampaign = userCampaigns.find(c => c.id === e.target.value);
                      if (selectedCampaign) {
                        setCampaignForm({
                          ...campaignForm,
                          campaignId: selectedCampaign.id,
                          campaignName: selectedCampaign.title,
                          packageType: selectedCampaign.package_type || '',
                          deadline: selectedCampaign.recruitment_deadline || ''
                        });
                      } else {
                        setCampaignForm({ ...campaignForm, campaignId: '' });
                      }
                    }}
                  >
                    <option value="">직접 입력</option>
                    {userCampaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title} ({campaign.region === 'japan' ? '일본' : '한국'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>진행 중인 캠페인이 없습니다</div>
                )}
              </FormGroup>

              <FormGroup>
                <Label>캠페인명 *</Label>
                <Input
                  type="text"
                  placeholder="캠페인명을 입력하세요"
                  value={campaignForm.campaignName}
                  onChange={(e) => setCampaignForm({ ...campaignForm, campaignName: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>패키지 *</Label>
                <Input
                  type="text"
                  placeholder="예: 기본 패키지, 프리미엄 패키지"
                  value={campaignForm.packageType}
                  onChange={(e) => setCampaignForm({ ...campaignForm, packageType: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>보상금액 *</Label>
                <Input
                  type="text"
                  placeholder="예: 500,000 (숫자만 입력)"
                  value={campaignForm.rewardAmount}
                  onChange={(e) => setCampaignForm({ ...campaignForm, rewardAmount: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>마감일 *</Label>
                <Input
                  type="text"
                  placeholder="예: 2025-12-31"
                  value={campaignForm.deadline}
                  onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
                />
              </FormGroup>
            </ModalBody>

            <ModalFooter>
              <CancelButton onClick={() => setShowCampaignModal(false)}>취소</CancelButton>
              <SubmitButton onClick={handleCampaignInvite} disabled={sending}>
                {sending ? '발송 중...' : '알림톡 발송'}
              </SubmitButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {showInquiryModal && (
        <ModalOverlay onClick={() => setShowInquiryModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>크리에이터 작업 문의</ModalTitle>
              <CloseButton onClick={() => setShowInquiryModal(false)}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              <SelectedCreatorsList>
                <ListTitle>선택한 크리에이터 ({selectedCreators.length}명)</ListTitle>
                {selectedCreators.map((creator) => (
                  <SelectedCreatorItem key={creator.id}>
                    {creator.profile_image_url && (
                      <SmallProfileImage src={creator.profile_image_url} alt={creator.name} />
                    )}
                    <span>{creator.nickname || creator.creator_name} (@{creator.nickname || creator.creator_name})</span>
                  </SelectedCreatorItem>
                ))}
              </SelectedCreatorsList>

              <FormGroup>
                <Label>기업명 *</Label>
                <Input
                  type="text"
                  placeholder="기업명을 입력하세요"
                  value={inquiryForm.companyName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, companyName: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>브랜드명 *</Label>
                <Input
                  type="text"
                  placeholder="브랜드명을 입력하세요"
                  value={inquiryForm.brandName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, brandName: e.target.value })}
                />
              </FormGroup>
            </ModalBody>

            <ModalFooter>
              <CancelButton onClick={() => setShowInquiryModal(false)}>취소</CancelButton>
              <SubmitButton onClick={handleInquirySubmit} disabled={sending}>
                {sending ? '전송 중...' : '문의 전송'}
              </SubmitButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  padding-top: 70px;
  padding-bottom: 90px;

  @media (min-width: 1024px) {
    padding-top: 40px;
    padding-bottom: 40px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;

  @media (min-width: 1024px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
`;

const SelectionBar = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    gap: 0;
  }
`;

const SelectionInfo = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

const InquiryButton = styled.button`
  background: white;
  color: #667eea;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
    font-size: 14px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const CreatorsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }
`;

const CreatorCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 16px;

  @media (min-width: 1024px) {
    padding: 24px;
  }
  box-shadow: ${props => props.isSelected 
    ? '0 8px 24px rgba(99, 102, 241, 0.3)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: ${props => props.isSelected ? '2px solid #6366f1' : '2px solid transparent'};
  transition: all 0.3s;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const SelectCheckbox = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
  z-index: 10;
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const ProfileImage = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
`;

const CreatorInfo = styled.div`
  flex: 1;
`;

const CreatorName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const ChannelHandle = styled.p`
  font-size: 14px;
  color: #666;
`;

const StatsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;

  @media (min-width: 768px) {
    gap: 16px;
    padding: 16px;
    flex-wrap: nowrap;
  }
`;

const StatItem = styled.div`
  flex: 1 1 40%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  @media (min-width: 768px) {
    flex: 1;
  }
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: #666;
  text-align: center;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
`;

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const CategoryTag = styled.span`
  background: #e0e7ff;
  color: #4f46e5;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const AdditionalFeeBox = styled.div`
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
`;

const AdditionalFeeLabel = styled.div`
  font-size: 11px;
  color: #ea580c;
  font-weight: 600;
  margin-bottom: 4px;
`;

const AdditionalFeeAmount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #ea580c;
  margin-bottom: 4px;
`;

const AdditionalFeeDesc = styled.div`
  font-size: 12px;
  color: #9a3412;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ViewProfileButton = styled.button`
  flex: 1 1 calc(50% - 4px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
`;

const AIProfileButton = styled.button`
  flex: 1 1 calc(50% - 4px);
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
`;

const CampaignInviteButton = styled.button`
  flex: 1 1 100%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

const PlatformButton = styled.a`
  flex: 1 1 calc(33.333% - 6px);
  min-width: 100px;
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
  padding: 10px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;

  &:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: #666;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #666;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #dc2626;
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 12px;

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 95%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: 640px) {
    width: 100%;
    max-height: 95vh;
    border-radius: 12px;
  }
`;

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  color: #666;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;

  &:hover {
    color: #1a1a1a;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const SelectedCreatorsList = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const ListTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
`;

const SelectedCreatorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  color: #1a1a1a;
`;

const SmallProfileImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ModalFooter = styled.div`
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }
`;

const SubmitButton = styled.button`
  padding: 12px 24px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default FeaturedCreatorsPage;
