package equipment

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Equipment struct {
	ID         string
	Type       string
	Name       string
	Status     string
	AssignedTo *string
	ReturnDate *time.Time
	CreatedAt  time.Time
}

type Request struct {
	ID          string
	EquipmentID *string
	UserID      string
	Type        string
	Mission     *string
	Location    *string
	StartDate   time.Time
	EndDate     time.Time
	Status      string
	Comment     *string
	CreatedAt   time.Time
	UserEmail   string
}

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) FindAll(ctx context.Context) ([]*Equipment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, type, name, status, assigned_to, return_date, created_at
		 FROM equipment ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Equipment
	for rows.Next() {
		e := &Equipment{}
		if err := rows.Scan(&e.ID, &e.Type, &e.Name, &e.Status, &e.AssignedTo, &e.ReturnDate, &e.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, nil
}

func (r *Repository) Create(ctx context.Context, e *Equipment) (*Equipment, error) {
	out := &Equipment{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO equipment (type, name, status)
		 VALUES ($1,$2,$3)
		 RETURNING id, type, name, status, assigned_to, return_date, created_at`,
		e.Type, e.Name, e.Status,
	).Scan(&out.ID, &out.Type, &out.Name, &out.Status, &out.AssignedTo, &out.ReturnDate, &out.CreatedAt)
	return out, err
}

func (r *Repository) UpdateEquipment(ctx context.Context, id, status string, assignedTo *string, returnDate *time.Time) error {
	_, err := r.db.Exec(ctx,
		`UPDATE equipment SET status=$1, assigned_to=$2, return_date=$3 WHERE id=$4`,
		status, assignedTo, returnDate, id,
	)
	return err
}

func (r *Repository) CreateRequest(ctx context.Context, req *Request) (*Request, error) {
	out := &Request{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO equipment_requests (equipment_id, user_id, type, mission, location, start_date, end_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, equipment_id, user_id, type, mission, location, start_date, end_date, status, comment, created_at`,
		req.EquipmentID, req.UserID, req.Type, req.Mission, req.Location, req.StartDate, req.EndDate,
	).Scan(&out.ID, &out.EquipmentID, &out.UserID, &out.Type, &out.Mission, &out.Location,
		&out.StartDate, &out.EndDate, &out.Status, &out.Comment, &out.CreatedAt)
	return out, err
}

func (r *Repository) FindRequests(ctx context.Context, userID, role string) ([]*Request, error) {
	var rows pgx.Rows
	var err error
	if role == "admin" || role == "super_admin" {
		rows, err = r.db.Query(ctx,
			`SELECT id, equipment_id, user_id, type, mission, location, start_date, end_date, status, comment, created_at
			 FROM equipment_requests ORDER BY created_at DESC`)
	} else {
		rows, err = r.db.Query(ctx,
			`SELECT id, equipment_id, user_id, type, mission, location, start_date, end_date, status, comment, created_at
			 FROM equipment_requests WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Request
	for rows.Next() {
		req := &Request{}
		if err := rows.Scan(&req.ID, &req.EquipmentID, &req.UserID, &req.Type, &req.Mission,
			&req.Location, &req.StartDate, &req.EndDate, &req.Status, &req.Comment, &req.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, req)
	}
	return items, nil
}

func (r *Repository) FindRequestByID(ctx context.Context, id string) (*Request, error) {
	req := &Request{}
	err := r.db.QueryRow(ctx,
		`SELECT er.id, er.equipment_id, er.user_id, er.type, er.mission, er.location,
		        er.start_date, er.end_date, er.status, er.comment, er.created_at,
		        COALESCE(u.email, '') AS user_email
		 FROM equipment_requests er
		 LEFT JOIN users u ON u.id = er.user_id
		 WHERE er.id=$1`, id,
	).Scan(&req.ID, &req.EquipmentID, &req.UserID, &req.Type, &req.Mission,
		&req.Location, &req.StartDate, &req.EndDate, &req.Status, &req.Comment, &req.CreatedAt,
		&req.UserEmail)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return req, err
}

func (r *Repository) UpdateRequestStatus(ctx context.Context, id, status string, comment *string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE equipment_requests SET status=$1, comment=$2 WHERE id=$3`,
		status, comment, id,
	)
	return err
}

func (r *Repository) FindOverdueRentals(ctx context.Context, today string) ([]*Request, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, equipment_id, user_id, type, mission, location, start_date, end_date, status, comment, created_at
		 FROM equipment_requests
		 WHERE type='location_externe' AND status='validee' AND end_date < $1::date
		 ORDER BY end_date ASC`, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Request
	for rows.Next() {
		req := &Request{}
		if err := rows.Scan(&req.ID, &req.EquipmentID, &req.UserID, &req.Type, &req.Mission,
			&req.Location, &req.StartDate, &req.EndDate, &req.Status, &req.Comment, &req.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, req)
	}
	return items, nil
}
