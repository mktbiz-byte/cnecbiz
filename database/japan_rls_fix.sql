-- ============================================================
-- 일본 사이트 RLS (Row Level Security) 수정 SQL
-- ============================================================
--
-- 문제: 일본 DB는 프론트엔드에서 anon key로 접속하며,
--       인증(auth)은 중앙 BIZ DB에서 처리됨.
--       따라서 auth.uid() 기반 RLS 정책은 모든 접근을 차단함.
--
-- 해결: anon / authenticated 역할에 대해 필요한 작업을 허용하는
--       RLS 정책을 설정. 보안은 API key 수준 + 애플리케이션 레벨에서 처리.
--       Netlify Functions는 service_role key를 사용하므로 RLS 우회.
--
-- 실행 위치: Supabase Japan 프로젝트 > SQL Editor
-- ============================================================


-- ============================================================
-- 1. campaigns 테이블
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 제거
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'campaigns'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON campaigns', pol.policyname);
    END LOOP;
END $$;

-- 전체 조회 허용 (기업 관리자 + 통합 관리자)
CREATE POLICY "campaigns_select_all"
    ON campaigns FOR SELECT
    TO anon, authenticated
    USING (true);

-- 캠페인 생성 허용
CREATE POLICY "campaigns_insert_all"
    ON campaigns FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 캠페인 수정 허용 (가이드 전달, 상태 업데이트 등)
CREATE POLICY "campaigns_update_all"
    ON campaigns FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 캠페인 삭제 허용
CREATE POLICY "campaigns_delete_all"
    ON campaigns FOR DELETE
    TO anon, authenticated
    USING (true);


-- ============================================================
-- 2. applications 테이블
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'applications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON applications', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "applications_select_all"
    ON applications FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "applications_insert_all"
    ON applications FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "applications_update_all"
    ON applications FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "applications_delete_all"
    ON applications FOR DELETE
    TO anon, authenticated
    USING (true);


-- ============================================================
-- 3. campaign_applications 테이블 (존재하는 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_applications' AND table_schema = 'public') THEN
        ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;

        -- 기존 정책 제거
        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'campaign_applications'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON campaign_applications', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "campaign_applications_select_all" ON campaign_applications FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "campaign_applications_insert_all" ON campaign_applications FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "campaign_applications_update_all" ON campaign_applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "campaign_applications_delete_all" ON campaign_applications FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 4. user_profiles 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "user_profiles_insert_all" ON user_profiles FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "user_profiles_update_all" ON user_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "user_profiles_delete_all" ON user_profiles FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 5. creators 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creators' AND table_schema = 'public') THEN
        ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'creators'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON creators', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "creators_select_all" ON creators FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "creators_insert_all" ON creators FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "creators_update_all" ON creators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "creators_delete_all" ON creators FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 6. line_users 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_users' AND table_schema = 'public') THEN
        ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'line_users'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON line_users', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "line_users_select_all" ON line_users FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "line_users_insert_all" ON line_users FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "line_users_update_all" ON line_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "line_users_delete_all" ON line_users FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 7. line_messages 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_messages' AND table_schema = 'public') THEN
        ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'line_messages'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON line_messages', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "line_messages_select_all" ON line_messages FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "line_messages_insert_all" ON line_messages FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "line_messages_update_all" ON line_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "line_messages_delete_all" ON line_messages FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 8. affiliated_creators 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliated_creators' AND table_schema = 'public') THEN
        ALTER TABLE affiliated_creators ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'affiliated_creators'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON affiliated_creators', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "affiliated_creators_select_all" ON affiliated_creators FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "affiliated_creators_insert_all" ON affiliated_creators FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "affiliated_creators_update_all" ON affiliated_creators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "affiliated_creators_delete_all" ON affiliated_creators FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 9. withdrawal_requests 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_requests' AND table_schema = 'public') THEN
        ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'withdrawal_requests'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON withdrawal_requests', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "withdrawal_requests_select_all" ON withdrawal_requests FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "withdrawal_requests_insert_all" ON withdrawal_requests FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "withdrawal_requests_update_all" ON withdrawal_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "withdrawal_requests_delete_all" ON withdrawal_requests FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 10. withdrawals 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals' AND table_schema = 'public') THEN
        ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'withdrawals'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON withdrawals', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "withdrawals_select_all" ON withdrawals FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "withdrawals_insert_all" ON withdrawals FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "withdrawals_update_all" ON withdrawals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "withdrawals_delete_all" ON withdrawals FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 11. creator_withdrawal_requests 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creator_withdrawal_requests' AND table_schema = 'public') THEN
        ALTER TABLE creator_withdrawal_requests ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'creator_withdrawal_requests'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON creator_withdrawal_requests', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "creator_withdrawal_requests_select_all" ON creator_withdrawal_requests FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "creator_withdrawal_requests_insert_all" ON creator_withdrawal_requests FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "creator_withdrawal_requests_update_all" ON creator_withdrawal_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "creator_withdrawal_requests_delete_all" ON creator_withdrawal_requests FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 12. revenue_records 테이블
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_records' AND table_schema = 'public') THEN
        ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'revenue_records'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON revenue_records', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "revenue_records_select_all" ON revenue_records FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "revenue_records_insert_all" ON revenue_records FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "revenue_records_update_all" ON revenue_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "revenue_records_delete_all" ON revenue_records FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 13. companies 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'companies'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "companies_select_all" ON companies FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "companies_insert_all" ON companies FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "companies_update_all" ON companies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "companies_delete_all" ON companies FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 14. admin_users 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users' AND table_schema = 'public') THEN
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'admin_users'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON admin_users', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "admin_users_select_all" ON admin_users FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "admin_users_insert_all" ON admin_users FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "admin_users_update_all" ON admin_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "admin_users_delete_all" ON admin_users FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 15. admins 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins' AND table_schema = 'public') THEN
        ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'admins'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON admins', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "admins_select_all" ON admins FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "admins_insert_all" ON admins FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "admins_update_all" ON admins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "admins_delete_all" ON admins FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 16. contracts 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts' AND table_schema = 'public') THEN
        ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'contracts'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON contracts', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "contracts_select_all" ON contracts FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "contracts_insert_all" ON contracts FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "contracts_update_all" ON contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "contracts_delete_all" ON contracts FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 17. points 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points' AND table_schema = 'public') THEN
        ALTER TABLE points ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'points'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON points', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "points_select_all" ON points FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "points_insert_all" ON points FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "points_update_all" ON points FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "points_delete_all" ON points FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 18. payments 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'payments'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON payments', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "payments_select_all" ON payments FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "payments_insert_all" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "payments_update_all" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "payments_delete_all" ON payments FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 19. featured_creators 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_creators' AND table_schema = 'public') THEN
        ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'featured_creators'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON featured_creators', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "featured_creators_select_all" ON featured_creators FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "featured_creators_insert_all" ON featured_creators FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "featured_creators_update_all" ON featured_creators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "featured_creators_delete_all" ON featured_creators FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 20. featured_creator_applications 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_creator_applications' AND table_schema = 'public') THEN
        ALTER TABLE featured_creator_applications ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'featured_creator_applications'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON featured_creator_applications', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "featured_creator_applications_select_all" ON featured_creator_applications FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "featured_creator_applications_insert_all" ON featured_creator_applications FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "featured_creator_applications_update_all" ON featured_creator_applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "featured_creator_applications_delete_all" ON featured_creator_applications FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 21. email_templates 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates' AND table_schema = 'public') THEN
        ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'email_templates'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON email_templates', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "email_templates_select_all" ON email_templates FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "email_templates_insert_all" ON email_templates FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "email_templates_update_all" ON email_templates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "email_templates_delete_all" ON email_templates FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 22. newsletters 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletters' AND table_schema = 'public') THEN
        ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'newsletters'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON newsletters', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "newsletters_select_all" ON newsletters FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "newsletters_insert_all" ON newsletters FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "newsletters_update_all" ON newsletters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "newsletters_delete_all" ON newsletters FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 23. channel_statistics 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_statistics' AND table_schema = 'public') THEN
        ALTER TABLE channel_statistics ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'channel_statistics'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON channel_statistics', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "channel_statistics_select_all" ON channel_statistics FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "channel_statistics_insert_all" ON channel_statistics FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "channel_statistics_update_all" ON channel_statistics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;


-- ============================================================
-- 24. our_channels 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'our_channels' AND table_schema = 'public') THEN
        ALTER TABLE our_channels ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'our_channels'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON our_channels', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "our_channels_select_all" ON our_channels FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "our_channels_insert_all" ON our_channels FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "our_channels_update_all" ON our_channels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "our_channels_delete_all" ON our_channels FOR DELETE TO anon, authenticated USING (true)';
    END IF;
END $$;


-- ============================================================
-- 25. site_settings 테이블 (있을 경우)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings' AND table_schema = 'public') THEN
        ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

        DECLARE
            pol RECORD;
        BEGIN
            FOR pol IN
                SELECT policyname FROM pg_policies WHERE tablename = 'site_settings'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON site_settings', pol.policyname);
            END LOOP;
        END;

        EXECUTE 'CREATE POLICY "site_settings_select_all" ON site_settings FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'CREATE POLICY "site_settings_insert_all" ON site_settings FOR INSERT TO anon, authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "site_settings_update_all" ON site_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;


-- ============================================================
-- BONUS: 만약 위 방법이 안되면 아래 비상용 SQL 사용
-- (RLS 자체를 비활성화 - 최후의 수단)
-- ============================================================
--
-- ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE creators DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE line_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE line_messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE affiliated_creators DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE creator_withdrawal_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE revenue_records DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE points DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE featured_creators DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE featured_creator_applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE newsletters DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_statistics DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE our_channels DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 확인용 쿼리: 현재 RLS 정책 상태 확인
-- ============================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- RLS 활성화 상태 확인
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
