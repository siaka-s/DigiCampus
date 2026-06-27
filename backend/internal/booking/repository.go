package booking

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Booking struct {
	ID           string
	SpaceID      string
	UserID       string
	Program      string
	StartTime    time.Time
	Duration     int
	Participants int
	Status       string
	IsUrgent     bool
	Comment      *string
	CreatedAt    time.Time
	UserEmail    string
	SpaceName    string
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, b *Booking) (*Booking, error) {
	out := &Booking{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO bookings (space_id, user_id, program, start_time, duration, participants, is_urgent)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, space_id, user_id, program, start_time, duration, participants, status, is_urgent, comment, created_at`,
		b.SpaceID, b.UserID, b.Program, b.StartTime, b.Duration, b.Participants, b.IsUrgent,
	).Scan(&out.ID, &out.SpaceID, &out.UserID, &out.Program, &out.StartTime,
		&out.Duration, &out.Participants, &out.Status, &out.IsUrgent, &out.Comment, &out.CreatedAt)
	return out, err
}

func (r *Repository) FindAll(ctx context.Context, userID, role string) ([]*Booking, error) {
	var rows pgx.Rows
	var err error
	if role == "admin" || role == "super_admin" {
		rows, err = r.db.Query(ctx,
			`SELECT id, space_id, user_id, program, start_time, duration, participants, status, is_urgent, comment, created_at
			 FROM bookings ORDER BY created_at DESC`)
	} else {
		rows, err = r.db.Query(ctx,
			`SELECT id, space_id, user_id, program, start_time, duration, participants, status, is_urgent, comment, created_at
			 FROM bookings WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var bookings []*Booking
	for rows.Next() {
		b := &Booking{}
		if err := rows.Scan(&b.ID, &b.SpaceID, &b.UserID, &b.Program, &b.StartTime,
			&b.Duration, &b.Participants, &b.Status, &b.IsUrgent, &b.Comment, &b.CreatedAt); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Booking, error) {
	b := &Booking{}
	err := r.db.QueryRow(ctx,
		`SELECT b.id, b.space_id, b.user_id, b.program, b.start_time, b.duration,
		        b.participants, b.status, b.is_urgent, b.comment, b.created_at,
		        COALESCE(u.email, '') AS user_email,
		        COALESCE(s.name, '')  AS space_name
		 FROM bookings b
		 LEFT JOIN users  u ON u.id = b.user_id
		 LEFT JOIN spaces s ON s.id = b.space_id
		 WHERE b.id=$1`, id,
	).Scan(&b.ID, &b.SpaceID, &b.UserID, &b.Program, &b.StartTime,
		&b.Duration, &b.Participants, &b.Status, &b.IsUrgent, &b.Comment, &b.CreatedAt,
		&b.UserEmail, &b.SpaceName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return b, err
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status string, comment *string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE bookings SET status=$1, comment=$2 WHERE id=$3`,
		status, comment, id,
	)
	return err
}
