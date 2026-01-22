// Base44 apps typically use createPageUrl("PageName") as a route helper.
// This is an explicit mapping so links stay stable even if filenames differ.

const routes: Record<string, string> = {
  Home: "/",
  GetStarted: "/get-started",
  SetupProfile: "/setup-profile",
  Profile: "/profile",

  Studies: "/studies",
  StudyDetail: "/study",
  StartStudy: "/start-study",
  StudySession: "/study-session",
  StudyBuilder: "/admin/study-builder",
  AdminStudies: "/admin/studies",

  Courses: "/courses",
  CourseDetail: "/course",
  CourseBuilder: "/admin/course-builder",
  AdminCourses: "/admin/courses",

  Groups: "/groups",
  GroupDetail: "/group",
  CreateGroup: "/create-group",

  CreateChurch: "/create-church",
  ChurchAdmin: "/church-admin",

  Community: "/community",
};

export function createPageUrl(pageName: string): string {
  return routes[pageName] ?? `/${pageName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}
