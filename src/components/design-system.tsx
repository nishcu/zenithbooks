"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { designTokens } from "@/lib/design-tokens";

// Design System Showcase Component
export function DesignSystemShowcase() {
  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">ZenithBooks Design System</h1>
        <p className="text-lg text-muted-foreground">
          A comprehensive design system for consistent UI/UX across the application
        </p>
      </div>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>Primary colors used throughout the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(designTokens.colors.primary).map(([shade, color]) => (
              <div key={shade} className="space-y-2">
                <div
                  className="h-16 rounded-lg border"
                  style={{ backgroundColor: color }}
                />
                <div className="text-sm">
                  <div className="font-medium">Primary {shade}</div>
                  <div className="text-muted-foreground font-mono text-xs">{color}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
          <CardDescription>All available button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h4 className="font-medium mb-3">Variants</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="info">Info</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h4 className="font-medium mb-3">Sizes</h4>
              <div className="flex flex-wrap items-end gap-3">
                <Button size="xs">XS</Button>
                <Button size="sm">SM</Button>
                <Button size="default">Default</Button>
                <Button size="md">MD</Button>
                <Button size="lg">LG</Button>
                <Button size="xl">XL</Button>
                <Button size="icon" variant="outline">🎯</Button>
                <Button size="icon-sm" variant="outline">🎯</Button>
                <Button size="icon-lg" variant="outline">🎯</Button>
              </div>
            </div>

            {/* Shapes */}
            <div>
              <h4 className="font-medium mb-3">Shapes</h4>
              <div className="flex flex-wrap gap-3">
                <Button shape="default">Default</Button>
                <Button shape="square">Square</Button>
                <Button shape="pill">Pill</Button>
                <Button shape="circle" size="icon">○</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Card Variants</CardTitle>
          <CardDescription>Different card styles for various use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Default Card</h4>
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>This is a default card with standard styling.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Card content goes here. This card has default padding and shadow.</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-3">Elevated Card</h4>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Elevated Card</CardTitle>
                  <CardDescription>This card has more pronounced shadows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content for the elevated card variant.</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-3">Outlined Card</h4>
              <Card variant="outlined">
                <CardHeader>
                  <CardTitle>Outlined Card</CardTitle>
                  <CardDescription>This card has a thicker border and no shadow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content for the outlined card variant.</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-3">Flat Card</h4>
              <Card variant="flat">
                <CardHeader>
                  <CardTitle>Flat Card</CardTitle>
                  <CardDescription>This card has no border or shadow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content for the flat card variant.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography Scale</CardTitle>
          <CardDescription>Consistent text sizing throughout the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(designTokens.typography.fontSize).map(([size, [fontSize, options]]) => (
              <div key={size} className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{size}</code>
                  <span className="ml-4 text-muted-foreground">{fontSize}</span>
                </div>
                <div style={{ fontSize, ...options }} className="text-right">
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spacing */}
      <Card>
        <CardHeader>
          <CardTitle>Spacing Scale</CardTitle>
          <CardDescription>Consistent spacing values used throughout the design system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {Object.entries(designTokens.spacing).map(([key, value]) => (
              <div key={key} className="text-center">
                <div
                  className="bg-primary/20 border border-primary/30 rounded mx-auto"
                  style={{ width: `${Math.min(value * 4, 64)}px`, height: `${Math.min(value * 4, 64)}px` }}
                />
                <div className="text-sm mt-2">
                  <code className="bg-muted px-1 rounded text-xs">{key}</code>
                </div>
                <div className="text-xs text-muted-foreground">{value}px</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Consistent styling for form inputs and controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="input-default">Default Input</Label>
                  <Input id="input-default" placeholder="Enter text..." />
                </div>

                <div>
                  <Label htmlFor="input-disabled">Disabled Input</Label>
                  <Input id="input-disabled" disabled placeholder="Disabled input" />
                </div>

                <div>
                  <Label htmlFor="input-error">Error Input</Label>
                  <Input id="input-error" className="border-destructive" placeholder="Input with error" />
                  <p className="text-sm text-destructive mt-1">This field is required</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Checkboxes</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Option 1</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm">Option 2</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Radio Buttons</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="radio" className="border-gray-300" />
                      <span className="text-sm">Option A</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="radio" className="border-gray-300" />
                      <span className="text-sm">Option B</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Badges</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Breakpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Breakpoints</CardTitle>
          <CardDescription>Breakpoints used for responsive design</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(designTokens.breakpoints).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <code className="font-medium">{name}</code>
                  <span className="text-muted-foreground ml-2">≥ {value}px</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {name === 'sm' && 'Mobile (landscape)'}
                  {name === 'md' && 'Tablet'}
                  {name === 'lg' && 'Desktop'}
                  {name === 'xl' && 'Large Desktop'}
                  {name === '2xl' && 'Extra Large Desktop'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
          <CardDescription>Best practices for using the design system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Component Usage</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Always use design system components over custom implementations</li>
                <li>• Maintain consistent spacing using the spacing scale</li>
                <li>• Use semantic color variants (success, warning, error) appropriately</li>
                <li>• Ensure all interactive elements meet accessibility standards</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Responsive Design</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use mobile-first approach with responsive breakpoints</li>
                <li>• Test all components on various screen sizes</li>
                <li>• Consider touch targets for mobile interactions</li>
                <li>• Optimize performance for mobile devices</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Accessibility</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maintain WCAG AA compliance for color contrast</li>
                <li>• Provide keyboard navigation for all interactive elements</li>
                <li>• Include proper ARIA labels and roles</li>
                <li>• Test with screen readers and keyboard navigation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
