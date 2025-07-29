'use client';

import React from 'react';
import { useAuth } from '@/lib/auth.context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  User,
  LogOut,
  Workflow,
  Settings,
  Bell,
  Zap,
} from 'lucide-react';

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Clinical FIRE
              </h1>
              <p className="text-xs text-muted-foreground">
                Healthcare Workflow Engine
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="nav-item active">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </a>
            <a href="#" className="nav-item">
              <Workflow className="w-4 h-4 mr-2" />
              Workflows
            </a>
            <a href="#" className="nav-item">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </a>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Profile */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {user.role}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 loading-shimmer rounded-lg"></div>
                <div className="hidden sm:block space-y-1">
                  <div className="w-20 h-3 loading-shimmer rounded"></div>
                  <div className="w-16 h-2 loading-shimmer rounded"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
