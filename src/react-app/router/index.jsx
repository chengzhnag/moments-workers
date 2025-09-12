import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../components/ProtectedRoute";

// 使用lazy加载实现代码分割
const Entry = lazy(() => import("../views/entry"));
const Login = lazy(() => import("../views/login"));
const Create = lazy(() => import("../views/create"));
const CreateAccount = lazy(() => import("../views/createAccount"));

// 加载组件
const LoadingComponent = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#666'
  }}>
    加载中...
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingComponent />}>
          <Entry />
        </Suspense>
      </ProtectedRoute>
    ),
    meta: {
      title: '🌟你的瞬间',
    },
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingComponent />}>
        <Login />
      </Suspense>
    ),
    meta: {
      title: '登录',
    },
  },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingComponent />}>
          <Create />
        </Suspense>
      </ProtectedRoute>
    ),
    meta: {
      title: '创建瞬间',
    },
  },
  {
    path: "/create-account",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingComponent />}>
          <CreateAccount />
        </Suspense>
      </ProtectedRoute>
    ),
    meta: {
      title: '创建账号',
    },
  },
]);

export default router;

