package event

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("événement introuvable")

// PublicEvent — vue collaborateur (sans métadonnées admin)
type PublicEvent struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Date        string `json:"date"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Location    string `json:"location"`
	Type        string `json:"type"`
}

// Event — vue admin complète
type Event struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Date        string    `json:"date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	Location    string    `json:"location"`
	Type        string    `json:"type"`
	CreatedBy   string    `json:"created_by"`
	IsPublished bool      `json:"is_published"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Date        string `json:"date"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Location    string `json:"location"`
	Type        string `json:"type"`
}

type UpdateInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Date        *string `json:"date"`
	StartTime   *string `json:"start_time"`
	EndTime     *string `json:"end_time"`
	Location    *string `json:"location"`
	Type        *string `json:"type"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListUpcoming(ctx context.Context) ([]*PublicEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, COALESCE(description,''), date, start_time, end_time,
		       COALESCE(location,''), type
		FROM events
		WHERE is_published = true AND date >= CURRENT_DATE
		ORDER BY date ASC, start_time ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []*PublicEvent
	for rows.Next() {
		var e PublicEvent
		if err := rows.Scan(
			&e.ID, &e.Title, &e.Description, &e.Date, &e.StartTime, &e.EndTime,
			&e.Location, &e.Type,
		); err != nil {
			return nil, err
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

func (r *Repository) ListAll(ctx context.Context) ([]*Event, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, COALESCE(description,''), date, start_time, end_time,
		       COALESCE(location,''), type, created_by, is_published, created_at, updated_at
		FROM events
		ORDER BY date DESC, start_time ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanEvents(rows)
}

func (r *Repository) Create(ctx context.Context, input CreateInput, createdBy string) (*Event, error) {
	var e Event
	err := r.pool.QueryRow(ctx, `
		INSERT INTO events (title, description, date, start_time, end_time, location, type, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, title, COALESCE(description,''), date, start_time, end_time,
		          COALESCE(location,''), type, created_by, is_published, created_at, updated_at
	`, input.Title, input.Description, input.Date, input.StartTime, input.EndTime,
		input.Location, input.Type, createdBy,
	).Scan(
		&e.ID, &e.Title, &e.Description, &e.Date, &e.StartTime, &e.EndTime,
		&e.Location, &e.Type, &e.CreatedBy, &e.IsPublished, &e.CreatedAt, &e.UpdatedAt,
	)
	return &e, err
}

func (r *Repository) Update(ctx context.Context, id string, input UpdateInput) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE events SET
		  title       = COALESCE($2, title),
		  description = COALESCE($3, description),
		  date        = COALESCE($4, date),
		  start_time  = COALESCE($5, start_time),
		  end_time    = COALESCE($6, end_time),
		  location    = COALESCE($7, location),
		  type        = COALESCE($8, type),
		  updated_at  = now()
		WHERE id = $1
	`, id, input.Title, input.Description, input.Date, input.StartTime,
		input.EndTime, input.Location, input.Type,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) SetPublished(ctx context.Context, id string, published bool) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE events SET is_published = $2, updated_at = now() WHERE id = $1`,
		id, published,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanEvents(rows pgx.Rows) ([]*Event, error) {
	var events []*Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.Title, &e.Description, &e.Date, &e.StartTime, &e.EndTime,
			&e.Location, &e.Type, &e.CreatedBy, &e.IsPublished, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}
