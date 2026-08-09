const { z } = require('zod');

const strings = {
  username: z.string().trim().min(1, 'اكتب اسم المستخدم').max(100),
  password: z.string().min(1, 'اكتب كلمة السر').max(128),
  code: z.string().trim().max(12).optional().default('')
};

const idParam = (msg) => z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/, msg).transform((v) => parseInt(v, 10))
]);

const courseSchema = z.object({
  title: z.string().trim().min(1, 'اكتب عنوان الكورس').max(200),
  grade: z.string().trim().max(100).default('الصف الثالث الثانوي'),
  term: z.string().trim().max(100).default('الفصل الدراسي الأول'),
  description: z.string().trim().max(5000).default(''),
  icon: z.string().trim().max(20).default('⚛️'),
  cover: z.string().trim().max(500).default(''),
  price: z.string().trim().max(200).default(''),
  price_amount: z.union([z.number().nonnegative(), z.string().trim().max(20).regex(/^\d*\.?\d*$/).transform((v) => (v === '' ? 0 : parseFloat(v)))]).default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0)
});

const lessonSchema = z.object({
  course_id: idParam('اختر الكورس'),
  title: z.string().trim().min(1, 'اكتب عنوان الدرس').max(200),
  video_url: z.string().trim().max(500).default(''),
  duration: z.string().trim().max(50).default(''),
  summary: z.string().trim().max(5000).default(''),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true)
});

const quizSchema = z.object({
  course_id: idParam('اختر الكورس'),
  title: z.string().trim().min(1, 'اكتب عنوان الاختبار').max(200),
  description: z.string().trim().max(5000).default(''),
  duration_minutes: z.union([
    z.number().int().min(1).max(300),
    z.string().regex(/^\d+$/, 'المدة غير صحيحة').transform((v) => parseInt(v, 10))
  ]).default(20),
  active: z.boolean().default(true)
});

const questionSchema = z.object({
  quiz_id: idParam('اختر الاختبار'),
  question: z.string().trim().min(1, 'اكتب السؤال').max(1000),
  options: z.array(z.string().trim().max(500)).min(2, 'لازم اختيارين على الأقل').max(8),
  correct_index: z.number().int().min(0).max(7),
  explanation: z.string().trim().max(2000).default(''),
  sort_order: z.number().int().default(0)
});

const testimonialSchema = z.object({
  client_name: z.string().trim().min(1, 'اكتب اسم الطالب').max(200),
  client_role: z.string().trim().max(200).default(''),
  content: z.string().trim().min(1, 'اكتب الرأي').max(5000),
  rating: z.number().int().min(1).max(5).default(5),
  image_url: z.string().trim().max(500).default(''),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
  active: z.boolean().default(true)
});

const testimonialSubmitSchema = z.object({
  client_name: z.string().trim().max(200).optional(),
  client_role: z.string().trim().max(200).default(''),
  content: z.string().trim().min(1, 'اكتب رأيك').max(5000),
  rating: z.number().int().min(1).max(5).default(5),
  image_url: z.string().trim().max(500).default('')
});

const testimonialPublicSchema = z.object({
  client_name: z.string().trim().min(1, 'اكتب اسمك').max(200),
  client_role: z.string().trim().max(200).default(''),
  content: z.string().trim().min(1, 'اكتب رأيك').max(5000),
  rating: z.number().int().min(1).max(5).default(5),
  image_url: z.string().trim().max(500).default(''),
  website: z.string().trim().max(100).default('')
});

const testimonialStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'])
});

const faqSchema = z.object({
  question: z.string().trim().min(1, 'اكتب السؤال').max(300),
  answer: z.string().trim().min(1, 'اكتب الإجابة').max(10000),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true)
});

const contactSchema = z.object({
  name: z.string().trim().min(1, 'اكتب اسمك').max(100),
  phone: z.string().trim().max(30).default(''),
  email: z.string().trim().max(120).default(''),
  subject: z.string().trim().max(100).default(''),
  message: z.string().trim().min(1, 'اكتب رسالتك').max(2000)
});

const loginSchema = z.object({
  username: strings.username,
  password: strings.password,
  code: strings.code
});

const changePasswordSchema = z.object({
  current_password: strings.password,
  new_password: z.string().min(8, 'كلمة السر الجديدة لازم تكون 8 أحرف على الأقل').max(128)
});

const verify2faSchema = z.object({
  base32: z.string().trim().min(10).max(200),
  otpauth_url: z.string().trim().max(500).default(''),
  code: z.string().trim().min(6).max(12)
});

const disable2faSchema = z.object({
  code: z.string().trim().min(6).max(12)
});

const emailStr = z.string().trim().toLowerCase().email('اكتب إيميل صحيح').max(120);
const passwordStr = z.string().min(8, 'كلمة السر لازم تكون 8 أحرف على الأقل').max(128);

const studentRegisterSchema = z.object({
  name: z.string().trim().min(1, 'اكتب اسمك').max(100),
  email: emailStr,
  password: passwordStr,
  phone: z.string().trim().max(30).default(''),
  parent_phone: z.string().trim().max(30).default(''),
  governorate: z.string().trim().max(100).default(''),
  academic_year: z.string().trim().max(100).default('')
});

const bookingSchema = z.object({
  student_name: z.string().trim().min(1, 'اكتب اسم الطالب').max(100),
  phone: z.string().trim().max(30).default(''),
  parent_name: z.string().trim().max(100).default(''),
  parent_phone: z.string().trim().max(30).default(''),
  governorate: z.string().trim().max(100).default(''),
  academic_year: z.string().trim().max(100).default(''),
  grade: z.string().trim().max(100).default(''),
  note: z.string().trim().max(1000).default('')
});

const studentLoginSchema = z.object({
  email: emailStr,
  password: z.string().min(1, 'اكتب كلمة السر').max(128)
});

const studentForgotSchema = z.object({
  email: emailStr
});

const studentVerifyCodeSchema = z.object({
  email: emailStr,
  code: z.string().trim().min(4, 'اكتب الكود').max(8)
});

const studentResetSchema = z.object({
  token: z.string().trim().min(10, 'الرابط غير صالح').max(200).optional().or(z.literal('')),
  email: emailStr.optional().or(z.literal('')),
  code: z.string().trim().min(4, 'اكتب الكود').max(8).optional().or(z.literal('')),
  password: passwordStr
});

const studentPasswordChangeSchema = z.object({
  current_password: z.string().min(1, 'اكتب كلمة السر الحالية').max(128),
  new_password: passwordStr
});

const enrollSchema = z.object({
  course_id: idParam('اختر الكورس')
});

const checkoutSchema = z.object({
  course_id: idParam('اختر الكورس'),
  reference: z.string().trim().min(4, 'اكتب رقم العملية اللي هيظهرلك بعد التحويل').max(100),
  payer_phone: z.string().trim().max(30).default('')
});

const paymentStatusSchema = z.object({
  status: z.enum(['paid', 'rejected']),
  note: z.string().trim().max(300).default('')
});

const quizSubmitSchema = z.object({
  quiz_id: idParam('اختر الاختبار'),
  answers: z.record(z.string(), z.number().int().min(-1).max(8)).default({})
});

const settingsSchema = z.object({
  settings: z.record(z.string().max(100), z.string().max(5000).default('')).optional()
}).default({});

const scheduleSchema = z.object({
      grade: z.string().trim().min(1, 'اختر الصف').max(100),
      day: z.string().trim().min(1, 'اختر اليوم').max(50),
      start_time: z.string().trim().min(1, 'اكتب وقت البداية').max(30),
      end_time: z.string().trim().max(30).default(''),
      note: z.string().trim().max(500).default(''),
      period: z.string().trim().max(20).default(''),
      tag: z.string().trim().max(60).default(''),
      tag_active: z.boolean().default(true),
      active: z.boolean().default(true),
      sort_order: z.number().int().default(0)
    });

    const taskSchema = z.object({
      title: z.string().trim().min(1, 'اكتب عنوان المهمة').max(200),
      description: z.string().trim().max(2000).default(''),
      category: z.string().trim().max(100).default(''),
      grade: z.string().trim().max(100).default(''),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
      due_date: z.string().trim().max(20).default(''),
      due_time: z.string().trim().max(20).default('')
    });

const materialSchema = z.object({
  title: z.string().trim().min(1, 'اكتب عنوان الملف').max(200),
  description: z.string().trim().max(2000).default(''),
  grade: z.string().trim().min(1, 'اختر الصف').max(100).default('الكل'),
  course_id: z.number().int().nonnegative().default(0),
  file_url: z.string().trim().max(500).default(''),
  file_name: z.string().trim().max(255).default(''),
  file_size: z.number().int().nonnegative().default(0),
  is_optional: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0)
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      const msg = result.error.issues[0] ? result.error.issues[0].message : 'بيانات غير صالحة';
      return res.status(400).json({ error: msg });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  validate,
  loginSchema,
  changePasswordSchema,
  verify2faSchema,
  disable2faSchema,
  studentRegisterSchema,
  studentLoginSchema,
  studentForgotSchema,
  studentVerifyCodeSchema,
  studentResetSchema,
  studentPasswordChangeSchema,
  enrollSchema,
  checkoutSchema,
  paymentStatusSchema,
  quizSubmitSchema,
  courseSchema,
  lessonSchema,
  quizSchema,
  questionSchema,
  testimonialSchema,
  testimonialSubmitSchema,
  testimonialPublicSchema,
  testimonialStatusSchema,
  bookingSchema,
  faqSchema,
  contactSchema,
  settingsSchema,
  scheduleSchema,
  materialSchema,
  taskSchema
};
