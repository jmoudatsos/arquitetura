import { useState } from "react";
import { data, Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { Button } from "../components/ui/Button.jsx";
import { CheckboxField, TextAreaField, TextField } from "../components/ui/Field.jsx";
import { Alert } from "../components/ui/Feedback.jsx";
import { Card } from "../components/ui/Layout.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { issuesToFieldErrors } from "../features/leads/lead.schema.js";
import { MediaPickerDialog, mediaSourceOf, MediaThumb } from "../features/media/media.components.jsx";
import { listMedia } from "../features/media/media.service.js";
import { notificationSettingsSchema, siteSettingsSchema } from "../features/settings/settings.schema.js";
import {
  getNotificationSettings,
  getSiteSettingsForEdit,
  updateNotificationSettings,
  updateSiteSettings,
} from "../features/settings/settings.service.js";
import { checkbox, formToObject } from "../utils/form-data.js";
import { imageUrl } from "../utils/image-url.js";

export const meta = () => adminMeta("Configurações");

export async function loader({ request }) {
  const { db, headers, demo } = await requireAdmin(request);
  const [site, notifications, media] = await Promise.all([getSiteSettingsForEdit(db), getNotificationSettings(db), listMedia(db)]);
  return data({ site, notifications, media, demo }, { headers });
}

export async function action({ request }) {
  const { db, headers } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "site") {
    const parsed = siteSettingsSchema.safeParse(formToObject(formData));
    if (!parsed.success) return data({ intent, errors: issuesToFieldErrors(parsed.error) }, { status: 400, headers });
    const { error } = await updateSiteSettings(db, parsed.data);
    if (error) return data({ intent, errors: { _form: error.message } }, { status: 400, headers });
    return data({ intent, ok: true, message: "Configurações do site salvas." }, { headers });
  }

  if (intent === "notifications") {
    const parsed = notificationSettingsSchema.safeParse({
      email_enabled: checkbox(formData.get("email_enabled")),
      email_recipients: String(formData.get("email_recipients") ?? ""),
      whatsapp_enabled: checkbox(formData.get("whatsapp_enabled")),
      whatsapp_recipient: String(formData.get("whatsapp_recipient") ?? ""),
    });
    if (!parsed.success) return data({ intent, errors: issuesToFieldErrors(parsed.error) }, { status: 400, headers });
    const { error } = await updateNotificationSettings(db, parsed.data);
    if (error) return data({ intent, errors: { _form: error.message } }, { status: 400, headers });
    return data({ intent, ok: true, message: "Notificações salvas." }, { headers });
  }

  return data({ intent, errors: { _form: "Ação desconhecida." } }, { status: 400, headers });
}

export default function AdminSettings() {
  const { site, notifications, media, demo } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submittingIntent = navigation.state === "submitting" ? navigation.formData?.get("intent") : null;
  const siteErrors = actionData?.intent === "site" ? (actionData.errors ?? {}) : {};
  const notifyErrors = actionData?.intent === "notifications" ? (actionData.errors ?? {}) : {};
  const [heroImage, setHeroImage] = useState(site.hero_image ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <AdminPageHeader title="Configurações" description="Textos, contatos e destinos das notificações de novos briefings." />

      <div className="grid gap-10 2xl:grid-cols-[1.4fr_1fr]">
        {/* ───── Site ───── */}
        <Form method="post" className="space-y-8" noValidate>
          <input type="hidden" name="intent" value="site" />
          {actionData?.intent === "site" && actionData.ok && <Alert tone="success">{actionData.message}</Alert>}
          {siteErrors._form && <Alert tone="error">{siteErrors._form}</Alert>}

          <Card className="space-y-5 p-6">
            <h2 className="text-[1.5rem] text-bone">Identidade</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Nome do estúdio" name="studio_name" required defaultValue={site.studio_name} maxLength={80} error={siteErrors.studio_name} />
              <TextField label="Slogan" name="tagline" defaultValue={site.tagline} maxLength={160} error={siteErrors.tagline} />
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="text-[1.5rem] text-bone">Página inicial</h2>
            <TextField label="Título do destaque" name="hero_title" defaultValue={site.hero_title} maxLength={140} error={siteErrors.hero_title} />
            <TextField
              label="Linha de apoio"
              name="hero_subtitle"
              defaultValue={site.hero_subtitle}
              maxLength={80}
              error={siteErrors.hero_subtitle}
              hint="Ex.: “Na região serrana”"
            />
            <div className="grid gap-5 md:grid-cols-[14rem_1fr]">
              <div>
                <MediaThumb src={imageUrl(heroImage)} className="aspect-[16/11]" />
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setPickerOpen(true)}>
                  Trocar imagem
                </Button>
                <input type="hidden" name="hero_image" value={heroImage} />
              </div>
              <TextAreaField
                label="Descrição da imagem (acessibilidade)"
                name="hero_image_alt"
                rows={3}
                defaultValue={site.hero_image_alt}
                maxLength={200}
                error={siteErrors.hero_image_alt}
              />
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="text-[1.5rem] text-bone">Página “Estúdio”</h2>
            <TextField label="Título" name="about_title" defaultValue={site.about_title} maxLength={160} error={siteErrors.about_title} />
            <TextAreaField
              label="Texto"
              name="about_body"
              rows={7}
              defaultValue={site.about_body}
              maxLength={3000}
              error={siteErrors.about_body}
              hint="Separe parágrafos com uma linha em branco. O primeiro parágrafo também aparece na página inicial."
            />
            <TextAreaField
              label="Área de atendimento"
              name="service_area"
              rows={2}
              defaultValue={site.service_area}
              maxLength={300}
              error={siteErrors.service_area}
            />
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="text-[1.5rem] text-bone">Contato público</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="WhatsApp do estúdio"
                name="contact_whatsapp"
                inputMode="numeric"
                defaultValue={site.contact_whatsapp}
                error={siteErrors.contact_whatsapp}
                hint="Só números com DDI + DDD. Ex.: 5548999990000"
              />
              <TextField label="E-mail" name="contact_email" type="email" defaultValue={site.contact_email} error={siteErrors.contact_email} />
              <TextField label="Telefone fixo (opcional)" name="contact_phone" defaultValue={site.contact_phone} maxLength={30} error={siteErrors.contact_phone} />
              <TextField
                label="Instagram"
                name="instagram_url"
                type="url"
                defaultValue={site.instagram_url}
                placeholder="https://instagram.com/seuestudio"
                error={siteErrors.instagram_url}
              />
            </div>
            <TextField label="Endereço" name="address" defaultValue={site.address} maxLength={200} error={siteErrors.address} />
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Cidade / região" name="city" defaultValue={site.city} maxLength={80} error={siteErrors.city} />
              <TextField label="Horário" name="opening_hours" defaultValue={site.opening_hours} maxLength={160} error={siteErrors.opening_hours} />
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="text-[1.5rem] text-bone">SEO</h2>
            <TextField label="Título padrão" name="seo_title" defaultValue={site.seo_title} maxLength={70} error={siteErrors.seo_title} />
            <TextAreaField
              label="Descrição padrão"
              name="seo_description"
              rows={2}
              defaultValue={site.seo_description}
              maxLength={200}
              error={siteErrors.seo_description}
            />
          </Card>

          <Button type="submit" size="lg" loading={submittingIntent === "site"}>
            Salvar configurações do site
          </Button>
        </Form>

        {/* ───── Notificações ───── */}
        <div className="space-y-8 2xl:sticky 2xl:top-8 2xl:self-start">
          <Form method="post" id="notificacoes" className="scroll-mt-8" noValidate>
            <input type="hidden" name="intent" value="notifications" />
            <Card className="space-y-5 p-6">
              <div>
                <h2 className="text-[1.5rem] text-bone">Notificações de briefing</h2>
                <p className="mt-1 text-mute">Quem recebe cada novo briefing. Campos vazios usam o padrão das Edge Functions.</p>
              </div>
              {actionData?.intent === "notifications" && actionData.ok && <Alert tone="success">{actionData.message}</Alert>}
              {notifyErrors._form && <Alert tone="error">{notifyErrors._form}</Alert>}

              <CheckboxField name="email_enabled" label="Enviar por e-mail" defaultChecked={notifications.email_enabled} />
              <TextAreaField
                label="E-mails de destino"
                name="email_recipients"
                rows={2}
                defaultValue={notifications.email_recipients.join("\n")}
                error={notifyErrors.email_recipients}
                hint="Um por linha (máx. 5)."
              />
              <CheckboxField name="whatsapp_enabled" label="Enviar por WhatsApp" defaultChecked={notifications.whatsapp_enabled} />
              <TextField
                label="WhatsApp de destino"
                name="whatsapp_recipient"
                inputMode="numeric"
                defaultValue={notifications.whatsapp_recipient ?? ""}
                error={notifyErrors.whatsapp_recipient}
                hint="DDI + DDD + número. Precisa estar habilitado no provedor (ex.: CallMeBot)."
              />
              <Button type="submit" loading={submittingIntent === "notifications"}>
                Salvar notificações
              </Button>
            </Card>
          </Form>

          <Card className="space-y-3 p-6 text-[1rem] text-mute">
            <h2 className="text-[1.375rem] text-bone">Chaves e provedores</h2>
            {demo && <Alert tone="warning">Modo demonstração: nada é enviado até o Supabase ser configurado.</Alert>}
            <p>
              As chaves de envio ficam como <strong className="text-bone">segredos das Edge Functions</strong> (nunca no site):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                E-mail (Resend): <code className="text-bone">RESEND_API_KEY</code>, <code className="text-bone">NOTIFY_EMAIL_FROM</code>
              </li>
              <li>
                WhatsApp: <code className="text-bone">WHATSAPP_PROVIDER</code> = callmebot · meta · twilio, mais a chave do provedor
              </li>
            </ul>
            <p className="text-faint">
              Configure com <code>npx supabase secrets set --env-file supabase/functions/.env</code> — passo a passo no README.
            </p>
          </Card>
        </div>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        media={media}
        onClose={() => setPickerOpen(false)}
        onConfirm={(items) => items[0] && setHeroImage(mediaSourceOf(items[0]))}
        title="Imagem do destaque"
      />
    </>
  );
}
