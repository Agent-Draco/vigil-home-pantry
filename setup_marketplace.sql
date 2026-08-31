-- Community Marketplace Database Setup
-- Run this SQL script in your Supabase SQL editor to create the marketplace tables

-- Create marketplace listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('s-comm', 'b-comm')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
  lister_id UUID NOT NULL,
  lister_name TEXT NOT NULL,
  item_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  participant1_name TEXT NOT NULL,
  participant2_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_mode ON listings(mode);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_lister_id ON listings(lister_id);
CREATE INDEX IF NOT EXISTS idx_requests_listing_id ON requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_chats_listing_id ON chats(listing_id);
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

-- Enable RLS (Row Level Security)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for listings
CREATE POLICY "Users can view all active listings" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "Users can insert their own listings" ON listings FOR INSERT WITH CHECK (lister_id = auth.uid());
CREATE POLICY "Users can update their own listings" ON listings FOR UPDATE USING (lister_id = auth.uid());
CREATE POLICY "Users can delete their own listings" ON listings FOR DELETE USING (lister_id = auth.uid());

-- RLS policies for requests
CREATE POLICY "Users can view requests for their listings" ON requests FOR SELECT USING (
  listing_id IN (SELECT id FROM listings WHERE lister_id = auth.uid()) OR 
  requester_id = auth.uid()
);
CREATE POLICY "Users can insert their own requests" ON requests FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users can update their own requests" ON requests FOR UPDATE USING (requester_id = auth.uid());
CREATE POLICY "Users can delete their own requests" ON requests FOR DELETE USING (requester_id = auth.uid());

-- RLS policies for chats
CREATE POLICY "Users can view chats they participate in" ON chats FOR SELECT USING (
  participant1_id = auth.uid() OR participant2_id = auth.uid()
);
CREATE POLICY "Users can insert chats they participate in" ON chats FOR INSERT WITH CHECK (
  participant1_id = auth.uid() OR participant2_id = auth.uid()
);
CREATE POLICY "Users can update chats they participate in" ON chats FOR UPDATE USING (
  participant1_id = auth.uid() OR participant2_id = auth.uid()
);
CREATE POLICY "Users can delete chats they participate in" ON chats FOR DELETE USING (
  participant1_id = auth.uid() OR participant2_id = auth.uid()
);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT USING (
  chat_id IN (
    SELECT id FROM chats WHERE 
    participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);
CREATE POLICY "Users can insert messages in their chats" ON messages FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT id FROM chats WHERE 
    participant1_id = auth.uid() OR participant2_id = auth.uid()
  ) AND sender_id = auth.uid()
);

-- Grant necessary permissions
GRANT ALL ON listings TO authenticated;
GRANT ALL ON requests TO authenticated;
GRANT ALL ON chats TO authenticated;
GRANT ALL ON messages TO authenticated;
