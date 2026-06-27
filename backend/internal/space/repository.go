package space

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SpaceDepartment struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Space struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Type           string            `json:"type"`
	Capacity       int               `json:"capacity"`
	Seats          int               `json:"seats"`
	Location       string            `json:"location"`
	EquipmentFixed []string          `json:"equipment_fixed"`
	Departments    []SpaceDepartment `json:"departments"`
	IsActive       bool              `json:"is_active"`
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func scanSpace(s *Space, depsJSON []byte) {
	if s.EquipmentFixed == nil {
		s.EquipmentFixed = []string{}
	}
	if len(depsJSON) > 0 {
		json.Unmarshal(depsJSON, &s.Departments) //nolint
	}
	if s.Departments == nil {
		s.Departments = []SpaceDepartment{}
	}
}

func (r *Repository) FindAll(ctx context.Context) ([]*Space, error) {
	rows, err := r.db.Query(ctx,
		`SELECT
		     s.id, s.name, s.type, s.capacity, s.seats, s.location,
		     s.equipment_fixed, s.is_active,
		     COALESCE(
		         json_agg(json_build_object('id', d.id, 'name', d.name))
		         FILTER (WHERE d.id IS NOT NULL),
		         '[]'::json
		     ) AS departments
		 FROM spaces s
		 LEFT JOIN space_departments sd ON sd.space_id = s.id
		 LEFT JOIN departments d ON d.id = sd.department_id
		 GROUP BY s.id
		 ORDER BY s.name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var spaces []*Space
	for rows.Next() {
		s := &Space{}
		var depsJSON []byte
		if err := rows.Scan(
			&s.ID, &s.Name, &s.Type, &s.Capacity, &s.Seats, &s.Location,
			&s.EquipmentFixed, &s.IsActive, &depsJSON,
		); err != nil {
			return nil, err
		}
		scanSpace(s, depsJSON)
		spaces = append(spaces, s)
	}
	return spaces, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Space, error) {
	s := &Space{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, type, capacity, seats, location, equipment_fixed, is_active
		 FROM spaces WHERE id = $1`,
		id,
	).Scan(&s.ID, &s.Name, &s.Type, &s.Capacity, &s.Seats, &s.Location, &s.EquipmentFixed, &s.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if s.EquipmentFixed == nil {
		s.EquipmentFixed = []string{}
	}
	return s, err
}

func (r *Repository) Create(ctx context.Context, s *Space, deptIDs []string) (*Space, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint

	out := &Space{}
	err = tx.QueryRow(ctx,
		`INSERT INTO spaces (name, type, capacity, seats, location, equipment_fixed)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, name, type, capacity, seats, location, equipment_fixed, is_active`,
		s.Name, s.Type, s.Capacity, s.Seats, s.Location, s.EquipmentFixed,
	).Scan(&out.ID, &out.Name, &out.Type, &out.Capacity, &out.Seats, &out.Location, &out.EquipmentFixed, &out.IsActive)
	if err != nil {
		return nil, err
	}

	if err := setDepartments(ctx, tx, out.ID, deptIDs); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	scanSpace(out, nil)
	return out, nil
}

func (r *Repository) Update(ctx context.Context, s *Space, deptIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint

	_, err = tx.Exec(ctx,
		`UPDATE spaces
		 SET name=$1, type=$2, capacity=$3, seats=$4, location=$5, equipment_fixed=$6
		 WHERE id=$7`,
		s.Name, s.Type, s.Capacity, s.Seats, s.Location, s.EquipmentFixed, s.ID,
	)
	if err != nil {
		return err
	}

	if err := setDepartments(ctx, tx, s.ID, deptIDs); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *Repository) SetActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE spaces SET is_active=$1 WHERE id=$2`,
		active, id,
	)
	return err
}

func setDepartments(ctx context.Context, tx pgx.Tx, spaceID string, deptIDs []string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM space_departments WHERE space_id=$1`, spaceID); err != nil {
		return err
	}
	for _, dID := range deptIDs {
		if dID == "" {
			continue
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO space_departments (space_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			spaceID, dID,
		); err != nil {
			return err
		}
	}
	return nil
}

// ─── Occupancy ───────────────────────────────────────────────────────────────

type OccupancyBooking struct {
	ID               string    `json:"id"`
	Program          string    `json:"program"`
	StartTime        time.Time `json:"start_time"`
	Duration         int       `json:"duration"`
	Status           string    `json:"status"`
	ResponsibleEmail string    `json:"responsible_email"`
}

type OccupancyItem struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Type           string            `json:"type"`
	Capacity       int               `json:"capacity"`
	Seats          int               `json:"seats"`
	Location       string            `json:"location"`
	EquipmentFixed []string          `json:"equipment_fixed"`
	Departments    []SpaceDepartment `json:"departments"`
	Bookings       []OccupancyBooking `json:"bookings"`
	PresenceCount  int               `json:"presence_count"`
	IsOverCapacity bool              `json:"is_over_capacity"`
}

func (r *Repository) FindAvailable(ctx context.Context, startTime time.Time, duration, participants int, endDate string) ([]*Space, error) {
	var (
		rows pgx.Rows
		err  error
	)

	if endDate != "" {
		// Période multiple : vérifie qu'aucun créneau n'est occupé sur l'ensemble des jours
		rows, err = r.db.Query(ctx,
			`SELECT id, name, type, capacity, seats, location, equipment_fixed, is_active
			 FROM spaces
			 WHERE is_active = true
			   AND type = 'salle_programme'
			   AND capacity >= $1
			   AND id NOT IN (
			     SELECT space_id FROM bookings
			     WHERE status IN ('en_attente','validee')
			       AND DATE(start_time) BETWEEN DATE($2) AND $4::date
			       AND EXTRACT(EPOCH FROM start_time::time) / 60 < EXTRACT(EPOCH FROM $2::time) / 60 + $3
			       AND EXTRACT(EPOCH FROM start_time::time) / 60 + duration > EXTRACT(EPOCH FROM $2::time) / 60
			   )
			 ORDER BY capacity ASC`,
			participants, startTime, duration, endDate,
		)
	} else {
		// Journée unique
		rows, err = r.db.Query(ctx,
			`SELECT id, name, type, capacity, seats, location, equipment_fixed, is_active
			 FROM spaces
			 WHERE is_active = true
			   AND type = 'salle_programme'
			   AND capacity >= $1
			   AND id NOT IN (
			     SELECT space_id FROM bookings
			     WHERE status IN ('en_attente','validee')
			       AND start_time < $2 + ($3 * interval '1 minute')
			       AND start_time + (duration * interval '1 minute') > $2
			   )
			 ORDER BY capacity ASC`,
			participants, startTime, duration,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var spaces []*Space
	for rows.Next() {
		s := &Space{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &s.Capacity, &s.Seats, &s.Location, &s.EquipmentFixed, &s.IsActive); err != nil {
			return nil, err
		}
		scanSpace(s, nil)
		spaces = append(spaces, s)
	}
	return spaces, nil
}

func (r *Repository) GetSeats(ctx context.Context, spaceID string) (int, error) {
	var seats int
	err := r.db.QueryRow(ctx,
		`SELECT seats FROM spaces WHERE id=$1 AND is_active=true`,
		spaceID,
	).Scan(&seats)
	return seats, err
}

func (r *Repository) GetName(ctx context.Context, spaceID string) (string, error) {
	var name string
	err := r.db.QueryRow(ctx,
		`SELECT name FROM spaces WHERE id=$1`,
		spaceID,
	).Scan(&name)
	return name, err
}

func (r *Repository) GetCapacity(ctx context.Context, spaceID string) (int, error) {
	var capacity int
	err := r.db.QueryRow(ctx,
		`SELECT capacity FROM spaces WHERE id=$1 AND is_active=true`,
		spaceID,
	).Scan(&capacity)
	return capacity, err
}

func (r *Repository) HasConflict(ctx context.Context, spaceID string, startTime time.Time, duration int, excludeID string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings
		 WHERE space_id=$1
		   AND status IN ('en_attente','validee')
		   AND id != COALESCE(NULLIF($4,''), '00000000-0000-0000-0000-000000000000')
		   AND start_time < $2 + ($3 * interval '1 minute')
		   AND start_time + (duration * interval '1 minute') > $2`,
		spaceID, startTime, duration, excludeID,
	).Scan(&count)
	return count > 0, err
}

func (r *Repository) GetOccupancyWeek(ctx context.Context, monday string) ([][]*OccupancyItem, error) {
	t, err := time.Parse("2006-01-02", monday)
	if err != nil {
		return nil, fmt.Errorf("date invalide: %w", err)
	}
	result := make([][]*OccupancyItem, 7)
	for i := 0; i < 7; i++ {
		date := t.AddDate(0, 0, i).Format("2006-01-02")
		items, err := r.GetOccupancy(ctx, date)
		if err != nil {
			return nil, err
		}
		result[i] = items
	}
	return result, nil
}

type DailyOccupancyRate struct {
	Date     string `json:"date"`
	Occupied int    `json:"occupied"`
	Total    int    `json:"total"`
}

func (r *Repository) GetOccupancyMonth(ctx context.Context, month string) ([]*DailyOccupancyRate, error) {
	// month = "YYYY-MM", on calcule le 1er jour du mois
	firstDay := month + "-01"
	rows, err := r.db.Query(ctx,
		`WITH
		 month_days AS (
		     SELECT generate_series(
		         $1::date,
		         ($1::date + interval '1 month' - interval '1 day'),
		         '1 day'::interval
		     )::date AS day
		 ),
		 total_rooms AS (
		     SELECT COUNT(*)::int AS n
		     FROM spaces
		     WHERE type = 'salle_programme' AND is_active = true
		 ),
		 occupied_per_day AS (
		     SELECT
		         DATE(b.start_time AT TIME ZONE 'UTC') AS day,
		         COUNT(DISTINCT b.space_id)::int AS n
		     FROM bookings b
		     JOIN spaces s ON s.id = b.space_id
		         AND s.type = 'salle_programme'
		         AND s.is_active = true
		     WHERE b.status = 'validee'
		       AND DATE(b.start_time AT TIME ZONE 'UTC') >= $1::date
		       AND DATE(b.start_time AT TIME ZONE 'UTC') < $1::date + interval '1 month'
		     GROUP BY DATE(b.start_time AT TIME ZONE 'UTC')
		 )
		 SELECT md.day::text, COALESCE(od.n, 0), tr.n
		 FROM month_days md
		 CROSS JOIN total_rooms tr
		 LEFT JOIN occupied_per_day od ON od.day = md.day
		 ORDER BY md.day ASC`,
		firstDay,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*DailyOccupancyRate
	for rows.Next() {
		d := &DailyOccupancyRate{}
		if err := rows.Scan(&d.Date, &d.Occupied, &d.Total); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
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

		bookings := []OccupancyBooking{}
		rows, err := r.db.Query(ctx,
			`SELECT b.id, b.program, b.start_time, b.duration, b.status,
			        COALESCE(u.email, '') AS responsible_email
			 FROM bookings b
			 LEFT JOIN users u ON u.id = b.user_id
			 WHERE b.space_id=$1
			   AND b.status IN ('en_attente','validee')
			   AND DATE(b.start_time AT TIME ZONE 'UTC') = $2::date
			 ORDER BY b.start_time ASC`,
			s.ID, date,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var b OccupancyBooking
				if rows.Scan(&b.ID, &b.Program, &b.StartTime, &b.Duration, &b.Status, &b.ResponsibleEmail) == nil {
					bookings = append(bookings, b)
				}
			}
		}

		var presenceCount int
		if s.Type == "bureau_partage" {
			r.db.QueryRow(ctx,
				`SELECT COUNT(*) FROM presence WHERE space_id=$1 AND date=$2::date`,
				s.ID, date,
			).Scan(&presenceCount)
		}

		items = append(items, &OccupancyItem{
			ID:             s.ID,
			Name:           s.Name,
			Type:           s.Type,
			Capacity:       s.Capacity,
			Seats:          s.Seats,
			Location:       s.Location,
			EquipmentFixed: s.EquipmentFixed,
			Departments:    s.Departments,
			Bookings:       bookings,
			PresenceCount:  presenceCount,
			IsOverCapacity: s.Type == "bureau_partage" && s.Seats > 0 && presenceCount > s.Seats,
		})
	}
	return items, nil
}
