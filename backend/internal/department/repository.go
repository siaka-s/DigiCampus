package department

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Department struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindAll(ctx context.Context) ([]*Department, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, category, is_active, created_at
		 FROM departments
		 ORDER BY category, name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var depts []*Department
	for rows.Next() {
		d := &Department{}
		if err := rows.Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, err
		}
		depts = append(depts, d)
	}
	return depts, nil
}

func (r *Repository) FindActive(ctx context.Context) ([]*Department, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, category, is_active, created_at
		 FROM departments
		 WHERE is_active = true
		 ORDER BY category, name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var depts []*Department
	for rows.Next() {
		d := &Department{}
		if err := rows.Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, err
		}
		depts = append(depts, d)
	}
	return depts, nil
}

func (r *Repository) Create(ctx context.Context, name, category string) (*Department, error) {
	d := &Department{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO departments (name, category)
		 VALUES ($1, $2)
		 RETURNING id, name, category, is_active, created_at`,
		name, category,
	).Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.CreatedAt)
	return d, err
}

func (r *Repository) Update(ctx context.Context, id, name string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE departments SET name=$1
		 WHERE id=$2 AND category IN ('interne', 'partenaire')`,
		name, id,
	)
	return err
}

func (r *Repository) SetActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE departments SET is_active=$1
		 WHERE id=$2 AND category IN ('interne', 'partenaire')`,
		active, id,
	)
	return err
}
