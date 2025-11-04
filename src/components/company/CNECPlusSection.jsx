import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import styled from 'styled-components'
import { Instagram, Youtube, TrendingUp, Users, Eye, Sparkles, Music } from 'lucide-react'

const CNECPlusSection = () => {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCNECPlusCreators()
  }, [])

  const fetchCNECPlusCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('cnec_plus_creators')
        .select('*')
        .eq('status', 'active')
        .eq('is_featured', true)
        .eq('country', 'korea')
        .order('display_order', { ascending: true })

      if (error) throw error
      setCreators(data || [])
    } catch (err) {
      console.error('Error fetching CNEC Plus creators:', err)
      setError('CNEC Plus 크리에이터 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatFollowers = (num) => {
    if (!num) return 'N/A'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <Container>
        <LoadingMessage>CNEC Plus 크리에이터 목록을 불러오는 중...</LoadingMessage>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    )
  }

  if (creators.length === 0) {
    return null // Don't show section if no creators
  }

  return (
    <Container>
      <Header>
        <TitleWithIcon>
          <Sparkles size={32} color="#6366f1" />
          <Title>CNEC Plus</Title>
        </TitleWithIcon>
        <Subtitle>AI가 분석한 프리미엄 크리에이터</Subtitle>
      </Header>

      <CreatorsGrid>
        {creators.map((creator) => (
          <CreatorCard key={creator.id}>
            <PremiumBadge>
              <Sparkles size={14} />
              AI 분석
            </PremiumBadge>

            <ProfileSection>
              {creator.profile_image_url && (
                <ProfileImage src={creator.profile_image_url} alt={creator.creator_name} />
              )}
              <CreatorInfo>
                <CreatorName>{creator.creator_name}</CreatorName>
                {creator.nickname && <ChannelHandle>@{creator.nickname}</ChannelHandle>}
              </CreatorInfo>
            </ProfileSection>

            <BioSection>
              <BioText>{creator.final_bio || creator.ai_generated_bio}</BioText>
            </BioSection>

            {creator.total_followers > 0 && (
              <StatsSection>
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
              </StatsSection>
            )}

            <CategoryTags>
              {(creator.final_categories || creator.ai_generated_categories || []).map((cat, idx) => (
                <CategoryTag key={idx}>{cat}</CategoryTag>
              ))}
            </CategoryTags>

            {creator.estimated_collaboration_fee && (
              <FeeBox>
                <FeeLabel>예상 협업 비용</FeeLabel>
                <FeeAmount>{creator.estimated_collaboration_fee.toLocaleString()}원</FeeAmount>
                {creator.estimated_fee_description && (
                  <FeeDesc>{creator.estimated_fee_description}</FeeDesc>
                )}
              </FeeBox>
            )}

            <ActionButtons>
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
        ))}
      </CreatorsGrid>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 60px auto 0;
  padding: 40px 20px;
  border-top: 2px solid #e5e7eb;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`

const TitleWithIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
`

const Title = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #ef4444;
  font-size: 16px;
`

const CreatorsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`

const CreatorCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  color: white;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(102, 126, 234, 0.3);
  }
`

const PremiumBadge = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`

const ProfileImage = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
`

const CreatorInfo = styled.div`
  flex: 1;
`

const CreatorName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: white;
`

const ChannelHandle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
`

const BioSection = styled.div`
  margin-bottom: 16px;
`

const BioText = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
`

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const StatLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const StatValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: white;
`

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`

const CategoryTag = styled.span`
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
`

const FeeBox = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`

const FeeLabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const FeeAmount = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
`

const FeeDesc = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`

const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PlatformButton = styled.a`
  flex: 1;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`

export default CNECPlusSection
