import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">ZenithBooks</h1>
                    <p className="text-gray-600">Professional Accounting Software</p>
                </div>
                <div className="bg-white py-8 px-6 shadow-lg rounded-lg border">
                    <LoginForm />
                </div>
                <div className="text-center text-sm text-gray-500">
                    <p>&copy; 2025 ZenithBooks. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
