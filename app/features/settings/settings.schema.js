import { z } from "zod";
import { toList } from "../../utils/form-data.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const text = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label}: máximo de ${max} caracteres`)
    .default("");

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .default("")
  .refine((value) => value === "" || EMAIL_RE.test(value), { message: "E-mail inválido" });

const optionalPhoneDigits = z
  .string()
  .default("")
  .transform((value) => value.replace(/\D/g, ""))
  .refine((digits) => digits === "" || (digits.length >= 10 && digits.length <= 15), {
    message: "Use DDI + DDD + número, ex.: 5548999990000",
  });

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(300)
  .default("")
  .refine((value) => value === "" || /^https:\/\/\S+$/i.test(value), {
    message: "Use um link completo começando com https://",
  });

export const siteSettingsSchema = z.object({
  studio_name: z.string().trim().min(2, "Informe o nome do estúdio").max(80),
  tagline: text(160, "Slogan"),
  hero_title: text(140, "Título do destaque"),
  hero_subtitle: text(80, "Subtítulo do destaque"),
  hero_image: text(500, "Imagem do destaque"),
  hero_image_alt: text(200, "Descrição da imagem"),
  about_title: text(160, "Título do estúdio"),
  about_body: text(3000, "Texto do estúdio"),
  contact_email: optionalEmail,
  contact_whatsapp: optionalPhoneDigits,
  contact_phone: text(30, "Telefone"),
  address: text(200, "Endereço"),
  city: text(80, "Cidade/região"),
  service_area: text(300, "Área de atendimento"),
  opening_hours: text(160, "Horário"),
  instagram_url: optionalHttpsUrl,
  seo_title: text(70, "Título SEO"),
  seo_description: text(200, "Descrição SEO"),
});

export const notificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  email_recipients: z
    .preprocess((value) => toList(value).map((email) => email.toLowerCase()), z.array(z.string()))
    .refine((list) => list.length <= 5, { message: "Máximo de 5 e-mails" })
    .refine((list) => list.every((email) => EMAIL_RE.test(email)), {
      message: "Há um e-mail inválido na lista",
    }),
  whatsapp_enabled: z.boolean(),
  whatsapp_recipient: optionalPhoneDigits,
});
