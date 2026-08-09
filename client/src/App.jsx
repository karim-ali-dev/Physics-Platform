import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './store/AppContext';
import { ADMIN_PATH } from './config';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Spinner from './components/Spinner';
import ChatBot from './components/ChatBot';
import FloatingIcons from './components/FloatingIcons';
import NotificationPrompt from './components/NotificationPrompt';
import SubscribePrompt from './components/SubscribePrompt';

const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const About = lazy(() => import('./pages/About'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const Contact = lazy(() => import('./pages/Contact'));
const Games = lazy(() => import('./pages/Games'));
const Schedule = lazy(() => import('./pages/Schedule'));

const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const CoursesAdmin = lazy(() => import('./pages/admin/CoursesAdmin'));
const CourseForm = lazy(() => import('./pages/admin/CourseForm'));
const LessonsAdmin = lazy(() => import('./pages/admin/LessonsAdmin'));
const LessonForm = lazy(() => import('./pages/admin/LessonForm'));
const QuizzesAdmin = lazy(() => import('./pages/admin/QuizzesAdmin'));
const QuizForm = lazy(() => import('./pages/admin/QuizForm'));
const StudentsAdmin = lazy(() => import('./pages/admin/StudentsAdmin'));
const StudentDetail = lazy(() => import('./pages/admin/StudentDetail'));
const TestimonialsAdmin = lazy(() => import('./pages/admin/TestimonialsAdmin'));
const FaqsAdmin = lazy(() => import('./pages/admin/FaqsAdmin'));
const MessagesAdmin = lazy(() => import('./pages/admin/MessagesAdmin'));
const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin'));
const SecurityAdmin = lazy(() => import('./pages/admin/SecurityAdmin'));
const ScheduleAdmin = lazy(() => import('./pages/admin/ScheduleAdmin'));
const TasksAdmin = lazy(() => import('./pages/admin/TasksAdmin'));
const HelpRequestsAdmin = lazy(() => import('./pages/admin/HelpRequestsAdmin'));
const PaymentsAdmin = lazy(() => import('./pages/admin/PaymentsAdmin'));
const BookingsAdmin = lazy(() => import('./pages/admin/BookingsAdmin'));
const MaterialsAdmin = lazy(() => import('./pages/admin/MaterialsAdmin'));
const StudentMaterials = lazy(() => import('./pages/student/StudentMaterials'));

const StudentLogin = lazy(() => import('./pages/student/StudentLogin'));
const StudentRegister = lazy(() => import('./pages/student/StudentRegister'));
const StudentForgot = lazy(() => import('./pages/student/StudentForgot'));
const StudentReset = lazy(() => import('./pages/student/StudentReset'));
const StudentAccount = lazy(() => import('./pages/student/StudentAccount'));
const CoursePlayer = lazy(() => import('./pages/student/CoursePlayer'));
const Community = lazy(() => import('./pages/Community'));
const CommunityAdmin = lazy(() => import('./pages/admin/CommunityAdmin'));
const NotificationsAdmin = lazy(() => import('./pages/admin/NotificationsAdmin'));

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={46} />
    </div>
  );
}

function Loader() {
  return <Spinner size={36} />;
}

function ProtectedRoute({ children }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) {
    return <Navigate to={`${ADMIN_PATH}/login`} state={{ from: location.pathname }} replace />;
  }
  return children;
}

function StudentProtectedRoute({ children }) {
  const { customer } = useApp();
  const location = useLocation();
  if (!customer) {
    return <Navigate to="/student/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={50} label="جاري تجهيز المنصة..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Routes>
        <Route path={`${ADMIN_PATH}/login`} element={<Suspense fallback={<FullLoader />}><AdminLogin /></Suspense>} />
        <Route path={ADMIN_PATH} element={<Suspense fallback={<FullLoader />}><ProtectedRoute><AdminLayout /></ProtectedRoute></Suspense>}>
          <Route index element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path="courses" element={<Suspense fallback={<Loader />}><CoursesAdmin /></Suspense>} />
          <Route path="courses/new" element={<Suspense fallback={<Loader />}><CourseForm /></Suspense>} />
          <Route path="courses/:id" element={<Suspense fallback={<Loader />}><CourseForm /></Suspense>} />
          <Route path="lessons" element={<Suspense fallback={<Loader />}><LessonsAdmin /></Suspense>} />
          <Route path="lessons/new" element={<Suspense fallback={<Loader />}><LessonForm /></Suspense>} />
          <Route path="lessons/:id" element={<Suspense fallback={<Loader />}><LessonForm /></Suspense>} />
          <Route path="quizzes" element={<Suspense fallback={<Loader />}><QuizzesAdmin /></Suspense>} />
          <Route path="quizzes/new" element={<Suspense fallback={<Loader />}><QuizForm /></Suspense>} />
          <Route path="quizzes/:id" element={<Suspense fallback={<Loader />}><QuizForm /></Suspense>} />
          <Route path="students" element={<Suspense fallback={<Loader />}><StudentsAdmin /></Suspense>} />
          <Route path="students/:id" element={<Suspense fallback={<Loader />}><StudentDetail /></Suspense>} />
          <Route path="testimonials" element={<Suspense fallback={<Loader />}><TestimonialsAdmin /></Suspense>} />
          <Route path="faqs" element={<Suspense fallback={<Loader />}><FaqsAdmin /></Suspense>} />
          <Route path="messages" element={<Suspense fallback={<Loader />}><MessagesAdmin /></Suspense>} />
          <Route path="schedule" element={<Suspense fallback={<Loader />}><ScheduleAdmin /></Suspense>} />
          <Route path="tasks" element={<Suspense fallback={<Loader />}><TasksAdmin /></Suspense>} />
          <Route path="help-requests" element={<Suspense fallback={<Loader />}><HelpRequestsAdmin /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<Loader />}><PaymentsAdmin /></Suspense>} />
          <Route path="bookings" element={<Suspense fallback={<Loader />}><BookingsAdmin /></Suspense>} />
          <Route path="materials" element={<Suspense fallback={<Loader />}><MaterialsAdmin /></Suspense>} />
          <Route path="community" element={<Suspense fallback={<Loader />}><CommunityAdmin /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<Loader />}><NotificationsAdmin /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Loader />}><SettingsAdmin /></Suspense>} />
          <Route path="security" element={<Suspense fallback={<Loader />}><SecurityAdmin /></Suspense>} />
        </Route>

        <Route path="*" element={<PublicLayout />} />
      </Routes>
    </div>
  );
}

function PageTransition({ children }) {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth;
    el.classList.add('page-enter');
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageTransition>
          <Routes>
          <Route path="/" element={<Suspense fallback={<FullLoader />}><Home /></Suspense>} />
          <Route path="/courses" element={<Suspense fallback={<FullLoader />}><Courses /></Suspense>} />
          <Route path="/courses/:id" element={<Suspense fallback={<FullLoader />}><CourseDetail /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<FullLoader />}><About /></Suspense>} />
          <Route path="/faq" element={<Suspense fallback={<FullLoader />}><FAQPage /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<FullLoader />}><Contact /></Suspense>} />
          <Route path="/games" element={<Suspense fallback={<FullLoader />}><Games /></Suspense>} />
          <Route path="/schedule" element={<Suspense fallback={<FullLoader />}><Schedule /></Suspense>} />
          <Route path="/student/login" element={<Suspense fallback={<FullLoader />}><StudentLogin /></Suspense>} />
          <Route path="/student/register" element={<Suspense fallback={<FullLoader />}><StudentRegister /></Suspense>} />
          <Route path="/student/forgot" element={<Suspense fallback={<FullLoader />}><StudentForgot /></Suspense>} />
          <Route path="/student/reset" element={<Suspense fallback={<FullLoader />}><StudentReset /></Suspense>} />
          <Route path="/student/account" element={<Suspense fallback={<FullLoader />}><StudentProtectedRoute><StudentAccount /></StudentProtectedRoute></Suspense>} />
          <Route path="/student/course/:id" element={<Suspense fallback={<FullLoader />}><StudentProtectedRoute><CoursePlayer /></StudentProtectedRoute></Suspense>} />
          <Route path="/student/materials" element={<Suspense fallback={<FullLoader />}><StudentProtectedRoute><StudentMaterials /></StudentProtectedRoute></Suspense>} />
          <Route path="/community" element={<Suspense fallback={<FullLoader />}><Community /></Suspense>} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </main>
      <FloatingIcons />
      <Footer />
      <NotificationPrompt />
      <SubscribePrompt />
      <ChatBot />
    </>
  );
}

function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center pt-28 text-center">
      <div className="grad-text text-7xl font-black">404</div>
      <p className="mt-4 text-white/60">الصفحة اللي بتدور عليها مش موجودة.</p>
      <a href="/" className="btn-primary mt-6">ارجع للرئيسية</a>
    </div>
  );
}
