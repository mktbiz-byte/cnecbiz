import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseBiz } from '../../lib/supabaseClients';
import styled from 'styled-components';
import { Instagram, Youtube, TrendingUp, Users, Eye } from 'lucide-react';

const FeaturedCreatorsPage = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <LoadingSpinner>로딩 중...</LoadingSpinner>
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
        <Title>추천 크리에이터</Title>
        <Subtitle>CNEC이 엄선한 검증된 크리에이터들을 만나보세요</Subtitle>
      </Header>

      <CreatorGrid>
        {creators.map((creator) => (
          <CreatorCard 
            key={creator.id}
            onClick={() => navigate(`/featured-creators/${creator.id}`)}
          >
            <CardHeader>
              <ProfileSection>
                {creator.portfolio_images && creator.portfolio_images[0] ? (
                  <ProfileImage src={creator.portfolio_images[0]} alt={creator.creator_name} />
                ) : (
                  <ProfilePlaceholder>
                    {creator.creator_name.charAt(0)}
                  </ProfilePlaceholder>
                )}
                <CreatorInfo>
                  <CreatorName>{creator.creator_name}</CreatorName>
                  <PlatformBadge>
                    {getPlatformIcon(creator)}
                    <span>크리에이터</span>
                  </PlatformBadge>
                </CreatorInfo>
              </ProfileSection>
            </CardHeader>

            <CardBody>
              <Bio>{creator.final_bio || creator.ai_generated_bio}</Bio>
              
              {(creator.final_categories || creator.ai_generated_categories) && (
                <Categories>
                  {(creator.final_categories || creator.ai_generated_categories).slice(0, 3).map((category, index) => (
                    <CategoryTag key={index}>{category}</CategoryTag>
                  ))}
                </Categories>
              )}

              <Stats>
                <StatItem>
                  <Users size={16} />
                  <StatLabel>팔로워</StatLabel>
                  <StatValue>{formatFollowers(creator.total_followers)}</StatValue>
                </StatItem>
                {creator.avg_engagement_rate && (
                  <StatItem>
                    <TrendingUp size={16} />
                    <StatLabel>참여율</StatLabel>
                    <StatValue>{creator.avg_engagement_rate}%</StatValue>
                  </StatItem>
                )}
                {creator.avg_views && (
                  <StatItem>
                    <Eye size={16} />
                    <StatLabel>평균 조회수</StatLabel>
                    <StatValue>{formatFollowers(creator.avg_views)}</StatValue>
                  </StatItem>
                )}
              </Stats>
            </CardBody>

            <CardFooter>
              <ViewProfileButton>프로필 보기</ViewProfileButton>
            </CardFooter>
          </CreatorCard>
        ))}
      </CreatorGrid>

      {creators.length === 0 && (
        <EmptyState>
          <EmptyIcon>👤</EmptyIcon>
          <EmptyText>아직 등록된 추천 크리에이터가 없습니다.</EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #666;
`;

const CreatorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CreatorCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`;

const CardHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ProfileImage = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
`;

const ProfilePlaceholder = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
`;

const CreatorInfo = styled.div`
  flex: 1;
`;

const CreatorName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
`;

const PlatformBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 13px;
  color: #666;

  svg {
    color: #667eea;
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const Bio = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: #444;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

const CategoryTag = styled.span`
  padding: 6px 12px;
  background: #f0f4ff;
  color: #667eea;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;

  svg {
    color: #667eea;
  }
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: #888;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
`;

const CardFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
`;

const ViewProfileButton = styled.button`
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
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
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
`;

const EmptyText = styled.p`
  font-size: 18px;
  color: #888;
`;

export default FeaturedCreatorsPage;
