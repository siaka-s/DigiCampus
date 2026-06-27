package mailer

import "fmt"

const baseStyle = `
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	background: #F8FAFC;
	margin: 0; padding: 40px 16px;
`

func wrap(title, content string) string {
	return fmt.Sprintf(`<!DOCTYPE html><html><body style="%s">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="background:#F97316;padding:24px 32px">
    <img src="https://digifemmes.ci/logo-digifemmes.png" alt="DigiFemmes" height="36"
         style="height:36px;object-fit:contain" onerror="this.style.display='none'" />
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1C1917">%s</h2>
    %s
  </div>
  <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #e2e8f0;font-size:12px;color:#6B7280">
    DigiSpace · DigiFemmes Côte d'Ivoire
  </div>
</div>
</body></html>`, baseStyle, title, content)
}

func p(text string) string {
	return fmt.Sprintf(`<p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6">%s</p>`, text)
}

func badge(text, bg, color string) string {
	return fmt.Sprintf(
		`<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;background:%s;color:%s">%s</span>`,
		bg, color, text,
	)
}

func row(label, value string) string {
	return fmt.Sprintf(`
<tr>
  <td style="padding:6px 0;font-size:13px;color:#6B7280;width:40%%">%s</td>
  <td style="padding:6px 0;font-size:13px;color:#1C1917;font-weight:500">%s</td>
</tr>`, label, value)
}

func table(rows string) string {
	return fmt.Sprintf(`<table style="width:100%%;border-collapse:collapse;margin:16px 0">%s</table>`, rows)
}

// ─── Emails compte ────────────────────────────────────────────────────────────

func CompteActive(prenom, email string) (subject, html string) {
	subject = "Votre compte DigiSpace est activé"
	html = wrap("Bienvenue sur DigiSpace", fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p("Votre compte a été activé. Vous pouvez maintenant vous connecter et accéder à la plateforme."),
		p(fmt.Sprintf("Identifiant : <strong>%s</strong>", email)),
	))
	return
}

// ─── Emails réservations ──────────────────────────────────────────────────────

func ReservationValidee(prenom, programme, salle, date, horaire string) (subject, html string) {
	subject = "Votre réservation a été confirmée"
	html = wrap("Réservation confirmée "+badge("Confirmée", "#F97316", "#fff"), fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p("Votre demande de salle a été validée par l'équipe."),
		table(
			row("Programme", programme)+
				row("Salle", salle)+
				row("Date", date)+
				row("Horaire", horaire),
		),
	))
	return
}

func ReservationRefusee(prenom, programme, commentaire string) (subject, html string) {
	subject = "Votre demande de salle a été refusée"
	html = wrap("Demande refusée "+badge("Refusée", "#DC2626", "#fff"), fmt.Sprintf(`
%s
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p(fmt.Sprintf("Votre demande pour le programme <strong>%s</strong> n'a pas pu être acceptée.", programme)),
		p(fmt.Sprintf("Motif : %s", commentaire)),
		p("Vous pouvez soumettre une nouvelle demande en modifiant le créneau ou les participants."),
	))
	return
}

func ReservationUrgenceReaffectee(prenom, programme, nouvelleSalle, date, horaire string) (subject, html string) {
	subject = "Votre salle a été réaffectée (urgence)"
	html = wrap("Réaffectation de salle "+badge("Urgence", "#EAB308", "#1C1917"), fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p(fmt.Sprintf("Suite à une contrainte d'urgence, votre programme <strong>%s</strong> a été déplacé vers une autre salle.", programme)),
		table(
			row("Nouvelle salle", nouvelleSalle)+
				row("Date", date)+
				row("Horaire", horaire),
		),
	))
	return
}

func RappelCreneau(prenom, programme, salle, date, horaire string) (subject, html string) {
	subject = "Rappel de créneau — " + programme
	html = wrap("Rappel de créneau", fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p("Votre créneau a lieu demain. Voici le récapitulatif :"),
		table(
			row("Programme", programme)+
				row("Salle", salle)+
				row("Date", date)+
				row("Horaire", horaire),
		),
	))
	return
}

// ─── Emails matériel IT ───────────────────────────────────────────────────────

func DemandeITValidee(prenom, materiel, mission, dateDebut, dateFin string) (subject, html string) {
	subject = "Votre demande de matériel IT a été validée"
	html = wrap("Demande IT confirmée "+badge("Validée", "#16A34A", "#fff"), fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p("Votre demande de matériel a été approuvée."),
		table(
			row("Matériel", materiel)+
				row("Mission", mission)+
				row("Du", dateDebut)+
				row("Au", dateFin),
		),
	))
	return
}

func DemandeITRefusee(prenom, materiel, commentaire string) (subject, html string) {
	subject = "Votre demande de matériel IT a été refusée"
	html = wrap("Demande IT refusée "+badge("Refusée", "#DC2626", "#fff"), fmt.Sprintf(`
%s
%s
%s`,
		p(fmt.Sprintf("Bonjour %s,", prenom)),
		p(fmt.Sprintf("Votre demande pour <strong>%s</strong> n'a pas pu être acceptée.", materiel)),
		p(fmt.Sprintf("Motif : %s", commentaire)),
	))
	return
}

func AlerteRetourMateriel(emailAdmin, materiel, collaborateur, dateRetour string) (subject, html string) {
	subject = "⚠ Retour matériel non clôturé — " + materiel
	html = wrap("Alerte retour matériel "+badge("Non clôturé", "#DC2626", "#fff"), fmt.Sprintf(`
%s
%s`,
		p(fmt.Sprintf("Le matériel <strong>%s</strong> attribué à <strong>%s</strong> devait être retourné le <strong>%s</strong>.", materiel, collaborateur, dateRetour)),
		p("Veuillez contacter le collaborateur et clôturer la location dans DigiSpace."),
	))
	_ = emailAdmin
	return
}

// ─── Email présence ───────────────────────────────────────────────────────────

func AlerteSuroccupation(emailAdmin, bureau string, presents, places int) (subject, html string) {
	subject = "⚠ Suroccupation bureau — " + bureau
	html = wrap("Alerte suroccupation "+badge("Suroccupé", "#DC2626", "#fff"), fmt.Sprintf(`
%s
%s`,
		p(fmt.Sprintf("Le bureau <strong>%s</strong> est en suroccupation : <strong>%d présents</strong> pour <strong>%d places</strong>.", bureau, presents, places)),
		p("Veuillez régulariser les déclarations de présence pour cette semaine."),
	))
	_ = emailAdmin
	return
}
