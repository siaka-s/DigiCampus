package space

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Space struct {
	ID             string
	Name           string
	Type           string
	Capacity       int
	Seats          int
	EquipmentFixed []string
	IsActive       bool
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindAll(ctx context.Context) ([]*Space, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, type, capacity, seats, equipment_fixed, is_active
		 FROM spaces ORDER BY name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var spaces []*Space
	for rows.Next() {
		s := &Space{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &s.Capacity, &s.Seats, &s.EquipmentFixed, &s.IsActive); err != nil {
			return nil, err
		}
		spaces = append(spaces, s)
	}
	return spaces, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Space, error) {
	s := &Space{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, type, capacity, seats, equipment_fixed, is_active
		 FROM spaces WHERE id = $1`,
		id,
	).Scan(&s.ID, &s.Name, &s.Type, &s.Capacity, &s.Seats, &s.EquipmentFixed, &s.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return s, err
}

func (r *Repository) Create(ctx context.Context, s *Space) (*Space, error) {
	out := &Space{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO spaces (name, type, capacity, seats, equipment_fixed)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, type, capacity, seats, equipment_fixed, is_active`,
		s.Name, s.Type, s.Capacity, s.Seats, s.EquipmentFixed,
	).Scan(&out.ID, &out.Name, &out.Type, &out.Capacity, &out.Seats, &out.EquipmentFixed, &out.IsActive)
	return out, err
}

func (r *Repository) Update(ctx context.Context, s *Space) error {
	_, err := r.db.Exec(ctx,
		`UPDATE spaces SET name=$1, type=$2, capacity=$3, seats=$4, equipment_fixed=$5
		 WHERE id=$6`,
		s.Name, s.Type, s.Capacity, s.Seats, s.EquipmentFixed, s.ID,
	)
	return err
}

func (r *Repository) SetActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE spaces SET is_active=$1 WHERE id=$2`,
		active, id,
	)
	return err
}

type OccupancyItem struct {
	ID             string        `json:"id"`
	Name           string        `json:"name"`
	Type           string        `json:"type"`
	Capacity       int           `json:"capacity"`
	Seats          int           `json:"seats"`
	EquipmentFixed []string      `json:"equipment_fixed"`
	Bookings       []interface{} `json:"bookings"`
	PresenceCount  int           `json:"presence_count"`
	IsOverCapacity bool          `json:"is_over_capacity"`
}

func (r *Repository) GetOccupancy(ctx context.Context, date string) ([]*OccupancyItem, error) {
	spaces, err := r.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]*OccupancyItem, 0, len(spaces))
	for _, s := range spaces {
		if !s.IsActive {
			continue
		}
		items = append(items, &OccupancyItem{
			ID:             s.ID,
			Name:           s.Name,
			Type:           s.Type,
			Capacity:       s.Capacity,
			Seats:          s.Seats,
			EquipmentFixed: s.EquipmentFixed,
			Bookings:       []interface{}{},
			PresenceCount:  0,
			IsOverCapacity: false,
		})
	}
	return items, nil
}
