import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseBiz } from '../../lib/supabaseClients';
import styled from 'styled-components';
import { Instagram, Youtube, TrendingUp, Users, Eye, CheckCircle, Circle, Send, Music } from 'lucide-react';
import CNECPlusSection from './CNECPlusSection';
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

  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creator_applications')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setCreators(data || []);
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
          brandName: inquiryForm.brandName
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

      <CreatorsGrid>
        {creators.map((creator) => {
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
                {creator.youtube_url && (
                  <PlatformButton href={creator.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Youtube size={16} />
                    YouTube
                  </PlatformButton>
                )}
                {creator.instagram_url && (
                  <PlatformButton href={creator.instagram_url} target="_blank" rel="noopener noreferrer">
                    <Instagram size={16} />
                    Instagram
                  </PlatformButton>
                )}
                {creator.tiktok_url && (
                  <PlatformButton href={creator.tiktok_url} target="_blank" rel="noopener noreferrer">
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

      {/* CNEC Plus Section */}
      <CNECPlusSection />

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
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
`;

const SelectionBar = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const CreatorsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

const CreatorCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
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
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
`;

const StatItem = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
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
  flex: 1 1 100%;
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
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
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
