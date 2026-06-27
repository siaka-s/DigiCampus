package notification

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Notification struct {
	ID          string
	UserID      string
	Type        string
	Message     string
	IsRead      bool
	ReferenceID *string
	CreatedAt   time.Time
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, n *Notification) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO notifications (user_id, type, message, reference_id)
		 VALUES ($1, $2, $3, $4)`,
		n.UserID, n.Type, n.Message, n.ReferenceID,
	)
	return err
}

func (r *Repository) FindByUser(ctx context.Context, userID string) ([]*Notification, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, type, message, is_read, reference_id, created_at
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT 50`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []*Notification
	for rows.Next() {
		n := &Notification{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Message, &n.IsRead, &n.ReferenceID, &n.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, n)
	}
	return items, nil
}

func (r *Repository) MarkRead(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	return err
}

func (r *Repository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
		userID,
	)
	return err
}
