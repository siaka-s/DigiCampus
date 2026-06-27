package mailer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const resendEndpoint = "https://api.resend.com/emails"

type emailPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// Send envoie un email via l'API Resend.
func Send(to, subject, html string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("MAIL_FROM")
	if apiKey == "" || from == "" {
		return fmt.Errorf("mailer: RESEND_API_KEY ou MAIL_FROM non défini")
	}

	body, err := json.Marshal(emailPayload{
		From:    from,
		To:      []string{to},
		Subject: subject,
		HTML:    html,
	})
	if err != nil {
		return fmt.Errorf("mailer: encodage JSON: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("mailer: création requête: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("mailer: envoi requête: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("mailer: erreur API Resend (status %d)", resp.StatusCode)
	}
	return nil
}
