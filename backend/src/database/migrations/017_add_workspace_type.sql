-- Add workspace_type column to workspaces table
ALTER TABLE workspaces
ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'standard' NOT NULL;

-- Add check constraint for workspace_type
ALTER TABLE workspaces
ADD CONSTRAINT workspaces_type_check
CHECK (workspace_type IN ('standard', 'tournament'));

-- Add index for workspace_type queries
CREATE INDEX idx_workspaces_type ON workspaces(workspace_type);

-- Add tournament configuration table for tournament workspaces
CREATE TABLE tournament_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    default_time_control VARCHAR(100),
    allow_player_registration BOOLEAN DEFAULT true,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    pairing_system VARCHAR(50) DEFAULT 'swiss', -- swiss, round_robin, knockout
    auto_pairing BOOLEAN DEFAULT false,
    rating_system VARCHAR(50) DEFAULT 'custom', -- fide, uscf, lichess, chess_com, custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id)
);

-- Add tournament rounds table for managing rounds
CREATE TABLE tournament_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, round_number)
);

-- Add tournament pairings table
CREATE TABLE tournament_pairings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
    white_player_id UUID NOT NULL REFERENCES users(id),
    black_player_id UUID NOT NULL REFERENCES users(id),
    board_number INT,
    game_id UUID REFERENCES chess_games(id) ON DELETE SET NULL,
    result VARCHAR(10), -- 1-0, 0-1, 1/2-1/2, *
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(round_id, white_player_id),
    UNIQUE(round_id, black_player_id)
);

-- Create indexes for tournament features
CREATE INDEX idx_tournament_configs_workspace ON tournament_configs(workspace_id);
CREATE INDEX idx_tournament_rounds_tournament ON tournament_rounds(tournament_id);
CREATE INDEX idx_tournament_rounds_status ON tournament_rounds(status);
CREATE INDEX idx_tournament_pairings_round ON tournament_pairings(round_id);
CREATE INDEX idx_tournament_pairings_game ON tournament_pairings(game_id);

-- Add trigger for tournament_configs updated_at
CREATE TRIGGER update_tournament_configs_updated_at
BEFORE UPDATE ON tournament_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment the tables
COMMENT ON TABLE tournament_configs IS 'Configuration for tournament workspaces';
COMMENT ON TABLE tournament_rounds IS 'Rounds within tournaments';
COMMENT ON TABLE tournament_pairings IS 'Pairings for each round';
COMMENT ON COLUMN workspaces.workspace_type IS 'Type of workspace: standard or tournament';
