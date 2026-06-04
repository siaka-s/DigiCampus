package presence

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Presence struct {
	ID         string
	UserID     string
	SpaceID    string
	Date       time.Time
	DeclaredAt time.Time
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, p *Presence) (*Presence, error) {
	out := &Presence{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO presence (user_id, space_id, date)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id, space_id, date) DO NOTHING
		 RETURNING id, user_id, space_id, date, declared_at`,
		p.UserID, p.SpaceID, p.Date,
	).Scan(&out.ID, &out.UserID, &out.SpaceID, &out.Date, &out.DeclaredAt)
	return out, err
}

func (r *Repository) FindBySpaceAndWeek(ctx context.Context, spaceID, weekStart string) ([]*Presence, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, space_id, date, declared_at FROM presence
		 WHERE space_id=$1 AND date >= $2::date AND date < $2::date + interval '7 days'
		 ORDER BY date ASC`,
		spaceID, weekStart,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Presence
	for rows.Next() {
		p := &Presence{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.SpaceID, &p.Date, &p.DeclaredAt); err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, nil
}

func (r *Repository) FindByUserAndWeek(ctx context.Context, userID, weekStart string) ([]*Presence, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, space_id, date, declared_at FROM presence
		 WHERE user_id=$1 AND date >= $2::date AND date < $2::date + interval '7 days'
		 ORDER BY date ASC`,
		userID, weekStart,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Presence
	for rows.Next() {
		p := &Presence{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.SpaceID, &p.Date, &p.DeclaredAt); err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Presence, error) {
	p := &Presence{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, space_id, date, declared_at FROM presence WHERE id=$1`, id,
	).Scan(&p.ID, &p.UserID, &p.SpaceID, &p.Date, &p.DeclaredAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return p, err
}

func (r *Repository) Update(ctx context.Context, id, newDate string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE presence SET date=$1 WHERE id=$2`, newDate, id,
	)
	return err
}

func (r *Repository) CountBySpaceAndDate(ctx context.Context, spaceID, date string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM presence WHERE space_id=$1 AND date=$2::date`,
		spaceID, date,
	).Scan(&count)
	return count, err
}
