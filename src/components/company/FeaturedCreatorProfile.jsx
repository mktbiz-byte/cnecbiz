import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseBiz } from '../../lib/supabaseClients';
import styled from 'styled-components';
import { ArrowLeft, Instagram, Youtube, TrendingUp, Users, Eye, DollarSign, AlertCircle, Play } from 'lucide-react';

const FeaturedCreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    companyName: '',
    brandName: ''
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCreatorProfile();
  }, [id]);

  const fetchCreatorProfile = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creator_applications')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (error) throw error;
      
      // 전화번호와 이메일 제거
      if (data) {
        delete data.phone;
        delete data.email;
      }
      
      setCreator(data);
    } catch (err) {
      console.error('Error fetching creator:', err);
      setError('크리에이터 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleInquirySubmit = async () => {
    if (!inquiryForm.companyName || !inquiryForm.brandName) {
      alert('기업명과 브랜드명을 모두 입력해주세요.');
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
          creators: [creator],
          companyName: inquiryForm.companyName,
          brandName: inquiryForm.brandName,
          channelId: 'b9387420-7c8d-e703-0f96-dbfc72565bb5'
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('문의가 성공적으로 전송되었습니다!');
        setShowInquiryModal(false);
        setInquiryForm({ companyName: '', brandName: '' });
      } else {
        const errorMsg = result.details ? `${result.error}\n\n상세: ${result.details}` : result.error || '문의 전송에 실패했습니다.';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      alert(error.message || '문의 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>로딩 중...</LoadingSpinner>
      </Container>
    );
  }

  if (error || !creator) {
    return (
      <Container>
        <ErrorMessage>{error || '크리에이터를 찾을 수 없습니다.'}</ErrorMessage>
        <BackButton onClick={() => navigate('/featured-creators')}>
          목록으로 돌아가기
        </BackButton>
      </Container>
    );
  }

  const platforms = [
    { name: 'YouTube', url: creator.youtube_url, icon: <Youtube size={20} /> },
    { name: 'Instagram', url: creator.instagram_url, icon: <Instagram size={20} /> },
    { name: 'TikTok', url: creator.tiktok_url, icon: <TrendingUp size={20} /> },
    { name: '기타 SNS', url: creator.other_sns_url, icon: <TrendingUp size={20} /> }
  ].filter(p => p.url);

  return (
    <Container>
      <BackButtonTop onClick={() => navigate('/featured-creators')}>
        <ArrowLeft size={20} />
        <span>목록으로</span>
      </BackButtonTop>

      <ProfileHeader>
        <ProfileImageSection>
          {creator.profile_image_url ? (
            <ProfileImageLarge src={creator.profile_image_url} alt={creator.creator_name} />
          ) : creator.portfolio_images && creator.portfolio_images[0] ? (
            <ProfileImageLarge src={creator.portfolio_images[0]} alt={creator.creator_name} />
          ) : (
            <ProfilePlaceholderLarge>
              {creator.creator_name.charAt(0)}
            </ProfilePlaceholderLarge>
          )}
        </ProfileImageSection>

        <ProfileInfo>
          <CreatorName>{creator.creator_name}</CreatorName>
          <Bio>{creator.final_bio || creator.ai_generated_bio}</Bio>

          {(creator.final_categories || creator.ai_generated_categories) && (
            <Categories>
              {(creator.final_categories || creator.ai_generated_categories).map((category, index) => (
                <CategoryTag key={index}>{category}</CategoryTag>
              ))}
            </Categories>
          )}

          <StatsGrid>
            <StatCard>
              <StatIcon><Users size={24} /></StatIcon>
              <StatLabel>총 팔로워</StatLabel>
              <StatValue>{formatFollowers(creator.total_followers)}</StatValue>
            </StatCard>
            {creator.avg_engagement_rate && (
              <StatCard>
                <StatIcon><TrendingUp size={24} /></StatIcon>
                <StatLabel>평균 참여율</StatLabel>
                <StatValue>{creator.avg_engagement_rate}%</StatValue>
              </StatCard>
            )}
            {creator.avg_views && (
              <StatCard>
                <StatIcon><Eye size={24} /></StatIcon>
                <StatLabel>평균 조회수</StatLabel>
                <StatValue>{formatFollowers(creator.avg_views)}</StatValue>
              </StatCard>
            )}
          </StatsGrid>
        </ProfileInfo>
      </ProfileHeader>

      {/* 추가금 정보 */}
      {creator.additional_fee > 0 && (
        <AdditionalFeeSection>
          <AdditionalFeeHeader>
            <DollarSign size={24} />
            <AdditionalFeeTitle>추가 비용 안내</AdditionalFeeTitle>
          </AdditionalFeeHeader>
          <AdditionalFeeAmount>
            + {formatCurrency(creator.additional_fee)}원
          </AdditionalFeeAmount>
          {creator.additional_fee_description && (
            <AdditionalFeeDescription>
              <AlertCircle size={16} />
              <span>{creator.additional_fee_description}</span>
            </AdditionalFeeDescription>
          )}
        </AdditionalFeeSection>
      )}

      {/* SNS 링크 */}
      {platforms.length > 0 && (
        <Section>
          <SectionTitle>SNS 채널</SectionTitle>
          <PlatformLinks>
            {platforms.map((platform, index) => (
              <PlatformLink 
                key={index}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {platform.icon}
                <span>{platform.name}</span>
              </PlatformLink>
            ))}
          </PlatformLinks>
        </Section>
      )}

      {/* 강점 */}
      {(creator.final_strengths || creator.ai_generated_strengths) && (
        <Section>
          <SectionTitle>주요 강점</SectionTitle>
          <StrengthsList>
            {(creator.final_strengths || creator.ai_generated_strengths).map((strength, index) => (
              <StrengthItem key={index}>
                <StrengthBullet>✓</StrengthBullet>
                <span>{strength}</span>
              </StrengthItem>
            ))}
          </StrengthsList>
        </Section>
      )}

      {/* 타겟 오디언스 */}
      {(creator.final_target_audience || creator.ai_generated_target_audience) && (
        <Section>
          <SectionTitle>타겟 오디언스</SectionTitle>
          <ContentBox>
            {creator.final_target_audience || creator.ai_generated_target_audience}
          </ContentBox>
        </Section>
      )}

      {/* 콘텐츠 스타일 */}
      {(creator.final_content_style || creator.ai_generated_content_style) && (
        <Section>
          <SectionTitle>콘텐츠 스타일</SectionTitle>
          <ContentBox>
            {creator.final_content_style || creator.ai_generated_content_style}
          </ContentBox>
        </Section>
      )}

      {/* 최근 숏폼 영상 */}
      {creator.recent_videos && creator.recent_videos.length > 0 && (
        <Section>
          <SectionTitle>
            <Play size={20} />
            최근 숏폼 영상
          </SectionTitle>
          <RecentVideosGrid>
            {creator.recent_videos.map((video, index) => (
              <VideoCard 
                key={index}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <VideoThumbnail src={video.thumbnail} alt={video.title} />
                <VideoOverlay>
                  <Play size={32} />
                </VideoOverlay>
                <VideoTitle>{video.title}</VideoTitle>
              </VideoCard>
            ))}
          </RecentVideosGrid>
        </Section>
      )}

      {/* 포트폴리오 이미지 */}
      {creator.portfolio_images && creator.portfolio_images.length > 1 && (
        <Section>
          <SectionTitle>포트폴리오</SectionTitle>
          <PortfolioGrid>
            {creator.portfolio_images.map((image, index) => (
              <PortfolioImage key={index} src={image} alt={`Portfolio ${index + 1}`} />
            ))}
          </PortfolioGrid>
        </Section>
      )}

      {/* 샘플 비디오 */}
      {creator.sample_video_urls && creator.sample_video_urls.length > 0 && (
        <Section>
          <SectionTitle>샘플 영상</SectionTitle>
          <VideoGrid>
            {creator.sample_video_urls.map((url, index) => (
              <VideoLink 
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                📹 샘플 영상 {index + 1}
              </VideoLink>
            ))}
          </VideoGrid>
        </Section>
      )}

      <ContactSection>
        <ContactTitle>이 크리에이터와 함께 작업하고 싶으신가요?</ContactTitle>
        <ContactButton onClick={() => setShowInquiryModal(true)}>
          이 크리에이터와 작업 문의하기
        </ContactButton>
      </ContactSection>

      {showInquiryModal && (
        <ModalOverlay onClick={() => setShowInquiryModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>크리에이터 작업 문의</ModalTitle>
              <CloseButton onClick={() => setShowInquiryModal(false)}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              <SelectedCreatorInfo>
                <strong>{creator.nickname || creator.creator_name}</strong>님과 작업을 문의합니다.
              </SelectedCreatorInfo>

              <FormGroup>
                <Label>기업명 *</Label>
                <Input
                  type="text"
                  placeholder="기업명을 입력하세요"
                  value={inquiryForm.companyName}
                  onChange={(e) => setInquiryForm({...inquiryForm, companyName: e.target.value})}
                />
              </FormGroup>

              <FormGroup>
                <Label>브랜드명 *</Label>
                <Input
                  type="text"
                  placeholder="브랜드명을 입력하세요"
                  value={inquiryForm.brandName}
                  onChange={(e) => setInquiryForm({...inquiryForm, brandName: e.target.value})}
                />
              </FormGroup>

              <SubmitButton onClick={handleInquirySubmit} disabled={sending}>
                {sending ? '전송 중...' : '문의 전송'}
              </SubmitButton>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 16px;
  padding-top: 70px;
  padding-bottom: 90px;

  @media (min-width: 1024px) {
    padding: 40px 20px;
  }
`;

const BackButtonTop = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  margin-bottom: 30px;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    border-color: #d0d0d0;
  }
`;

const ProfileHeader = styled.div`
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;

  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const ProfileImageSection = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
`;

const ProfileImageLarge = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  @media (min-width: 768px) {
    width: 150px;
    height: 150px;
  }
`;

const ProfilePlaceholderLarge = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  @media (min-width: 768px) {
    width: 150px;
    height: 150px;
    font-size: 48px;
  }
`;

const ProfileInfo = styled.div`
  text-align: center;
`;

const CreatorName = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    font-size: 32px;
    margin-bottom: 20px;
  }
`;

const Bio = styled.p`
  font-size: 16px;
  line-height: 1.8;
  color: #444;
  margin-bottom: 24px;
  text-align: left;
`;

const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
`;

const CategoryTag = styled.span`
  padding: 8px 16px;
  background: #f0f4ff;
  color: #667eea;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
    margin-top: 30px;
  }
`;

const StatCard = styled.div`
  padding: 12px;
  background: #f9f9f9;
  border-radius: 12px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const StatIcon = styled.div`
  color: #667eea;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;

  @media (min-width: 768px) {
    font-size: 24px;
  }
`;

const AdditionalFeeSection = styled.div`
  background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);
  border: 2px solid #ffb366;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    padding: 30px;
    margin-bottom: 30px;
  }
`;

const AdditionalFeeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  svg {
    color: #ff8c00;
  }
`;

const AdditionalFeeTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #cc6600;
`;

const AdditionalFeeAmount = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #ff8c00;
  margin-bottom: 12px;

  @media (min-width: 768px) {
    font-size: 32px;
  }
`;

const AdditionalFeeDescription = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: #996600;
  line-height: 1.6;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const Section = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    font-size: 22px;
    margin-bottom: 20px;
  }
`;

const RecentVideosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
`;

const VideoCard = styled.a`
  position: relative;
  display: block;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const VideoThumbnail = styled.img`
  width: 100%;
  aspect-ratio: 9 / 16;
  object-fit: cover;
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;

  ${VideoCard}:hover & {
    opacity: 1;
  }
`;

const VideoTitle = styled.div`
  padding: 12px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #444;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PlatformLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const PlatformLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f5f5f5;
  border-radius: 10px;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #667eea;
    color: white;
  }
`;

const StrengthsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StrengthItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  font-size: 15px;
  color: #444;
  line-height: 1.6;

  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }
`;

const StrengthBullet = styled.span`
  color: #667eea;
  font-weight: 700;
  font-size: 18px;
`;

const ContentBox = styled.div`
  padding: 20px;
  background: #f9f9f9;
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.8;
  color: #444;
`;

const PortfolioGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
`;

const PortfolioImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const VideoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VideoLink = styled.a`
  display: block;
  padding: 16px 20px;
  background: #f5f5f5;
  border-radius: 10px;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #667eea;
    color: white;
  }
`;

const ContactSection = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  color: white;

  @media (min-width: 768px) {
    padding: 40px;
  }
`;

const ContactTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    font-size: 24px;
    margin-bottom: 24px;
  }
`;

const ContactButton = styled.button`
  padding: 16px 40px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 60px;
  font-size: 18px;
  color: #666;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 60px;
  font-size: 16px;
  color: #e74c3c;
  margin-bottom: 20px;
`;

const BackButton = styled.button`
  display: block;
  margin: 0 auto;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

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
  max-width: 500px;
  width: 100%;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  @media (max-width: 640px) {
    border-radius: 12px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
`;

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const SelectedCreatorInfo = styled.div`
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 15px;
  color: #444;
  text-align: center;

  strong {
    color: #667eea;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #444;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &::placeholder {
    color: #999;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default FeaturedCreatorProfile;
