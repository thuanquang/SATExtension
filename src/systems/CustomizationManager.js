/**
 * CustomizationManager - Handles user interface customization
 * Manages themes, layouts, and personalization options
 */

class CustomizationManager {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.themes = this._initializeThemes();
    this.layouts = this._initializeLayouts();
    this.currentTheme = 'default';
    this.currentLayout = 'standard';
  }

  /**
   * Initialize available themes
   */
  _initializeThemes() {
    return {
      default: {
        id: 'default',
        name: 'Classic Scholar',
        description: 'Clean and professional design',
        unlockLevel: 1,
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          accent: '#8b5cf6'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '8px',
        shadows: {
          small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }
      },
      midnight_scholar: {
        id: 'midnight_scholar',
        name: 'Midnight Scholar',
        description: 'Dark theme for late-night studying',
        unlockLevel: 3,
        colors: {
          primary: '#6366f1',
          secondary: '#94a3b8',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#94a3b8',
          success: '#22c55e',
          warning: '#eab308',
          error: '#f87171',
          accent: '#a855f7'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '8px',
        shadows: {
          small: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
          medium: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
          large: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
        }
      },
      forest_focus: {
        id: 'forest_focus',
        name: 'Forest Focus',
        description: 'Nature-inspired green theme',
        unlockLevel: 5,
        colors: {
          primary: '#059669',
          secondary: '#6b7280',
          background: '#f0fdf4',
          surface: '#dcfce7',
          text: '#14532d',
          textSecondary: '#374151',
          success: '#10b981',
          warning: '#d97706',
          error: '#dc2626',
          accent: '#7c3aed'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '12px',
        shadows: {
          small: '0 1px 2px 0 rgba(5, 150, 105, 0.1)',
          medium: '0 4px 6px -1px rgba(5, 150, 105, 0.15)',
          large: '0 10px 15px -3px rgba(5, 150, 105, 0.2)'
        }
      },
      ocean_depths: {
        id: 'ocean_depths',
        name: 'Ocean Depths',
        description: 'Calming blue theme for focus',
        unlockLevel: 8,
        colors: {
          primary: '#0284c7',
          secondary: '#64748b',
          background: '#f0f9ff',
          surface: '#e0f2fe',
          text: '#0c4a6e',
          textSecondary: '#475569',
          success: '#0891b2',
          warning: '#ea580c',
          error: '#dc2626',
          accent: '#7c2d12'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '10px',
        shadows: {
          small: '0 1px 2px 0 rgba(2, 132, 199, 0.1)',
          medium: '0 4px 6px -1px rgba(2, 132, 199, 0.15)',
          large: '0 10px 15px -3px rgba(2, 132, 199, 0.2)'
        }
      },
      sunset_study: {
        id: 'sunset_study',
        name: 'Sunset Study',
        description: 'Warm orange and pink theme',
        unlockLevel: 12,
        colors: {
          primary: '#ea580c',
          secondary: '#78716c',
          background: '#fef7ed',
          surface: '#fed7aa',
          text: '#9a3412',
          textSecondary: '#57534e',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
          accent: '#c2410c'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '14px',
        shadows: {
          small: '0 1px 2px 0 rgba(234, 88, 12, 0.1)',
          medium: '0 4px 6px -1px rgba(234, 88, 12, 0.15)',
          large: '0 10px 15px -3px rgba(234, 88, 12, 0.2)'
        }
      },
      galaxy_genius: {
        id: 'galaxy_genius',
        name: 'Galaxy Genius',
        description: 'Cosmic purple theme for advanced learners',
        unlockLevel: 15,
        colors: {
          primary: '#7c3aed',
          secondary: '#6b7280',
          background: '#faf5ff',
          surface: '#f3e8ff',
          text: '#581c87',
          textSecondary: '#374151',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          accent: '#a855f7'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '16px',
        shadows: {
          small: '0 1px 2px 0 rgba(124, 58, 237, 0.1)',
          medium: '0 4px 6px -1px rgba(124, 58, 237, 0.15)',
          large: '0 10px 15px -3px rgba(124, 58, 237, 0.2)'
        }
      },
      rainbow_master: {
        id: 'rainbow_master',
        name: 'Rainbow Master',
        description: 'Vibrant multi-color theme',
        unlockLevel: 20,
        colors: {
          primary: '#ec4899',
          secondary: '#6b7280',
          background: '#fefce8',
          surface: '#fef3c7',
          text: '#92400e',
          textSecondary: '#374151',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          accent: '#8b5cf6'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '18px',
        shadows: {
          small: '0 1px 2px 0 rgba(236, 72, 153, 0.1)',
          medium: '0 4px 6px -1px rgba(236, 72, 153, 0.15)',
          large: '0 10px 15px -3px rgba(236, 72, 153, 0.2)'
        }
      },
      custom_creator: {
        id: 'custom_creator',
        name: 'Custom Creator',
        description: 'Create your own custom theme',
        unlockLevel: 25,
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          accent: '#8b5cf6'
        },
        fonts: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif'
        },
        borderRadius: '8px',
        shadows: {
          small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        },
        customizable: true
      }
    };
  }

  /**
   * Initialize available layouts
   */
  _initializeLayouts() {
    return {
      standard: {
        id: 'standard',
        name: 'Standard',
        description: 'Traditional quiz layout',
        unlockLevel: 1,
        settings: {
          questionPosition: 'top',
          answersLayout: 'vertical',
          progressBarPosition: 'top',
          timerPosition: 'top-right',
          feedbackPosition: 'center'
        }
      },
      compact: {
        id: 'compact',
        name: 'Compact',
        description: 'Space-efficient layout',
        unlockLevel: 5,
        settings: {
          questionPosition: 'top',
          answersLayout: 'horizontal',
          progressBarPosition: 'bottom',
          timerPosition: 'top-left',
          feedbackPosition: 'bottom'
        }
      },
      focused: {
        id: 'focused',
        name: 'Focused',
        description: 'Minimal distractions',
        unlockLevel: 10,
        settings: {
          questionPosition: 'center',
          answersLayout: 'vertical',
          progressBarPosition: 'hidden',
          timerPosition: 'hidden',
          feedbackPosition: 'overlay'
        }
      },
      dashboard: {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Information-rich layout',
        unlockLevel: 15,
        settings: {
          questionPosition: 'left',
          answersLayout: 'vertical',
          progressBarPosition: 'right',
          timerPosition: 'right',
          feedbackPosition: 'right',
          showStats: true,
          showHints: true
        }
      }
    };
  }

  /**
   * Get user's current customization settings
   */
  async getUserCustomization(userId) {
    try {
      const { data, error } = await window.supabaseQuery('user_customizations', 'select', null, { user_id: userId });

      if (error) {
        console.error('Error fetching user customization:', error);
        return this.getDefaultCustomization();
      }

      if (!data || data.length === 0) {
        return this.getDefaultCustomization();
      }

      const customization = data[0];
      return {
        theme: customization.theme_id || 'default',
        layout: customization.layout_id || 'standard',
        customColors: customization.custom_colors || {},
        preferences: customization.preferences || {},
        lastUpdated: customization.updated_at
      };

    } catch (error) {
      console.error('Exception in getUserCustomization:', error);
      return this.getDefaultCustomization();
    }
  }

  /**
   * Update user customization settings
   */
  async updateUserCustomization(userId, customization) {
    try {
      const updates = {
        user_id: userId,
        theme_id: customization.theme,
        layout_id: customization.layout,
        custom_colors: customization.customColors || {},
        preferences: customization.preferences || {},
        updated_at: new Date().toISOString()
      };

      const { data, error } = await window.supabaseQuery('user_customizations', 'upsert', updates);

      if (error) {
        console.error('Error updating user customization:', error);
        return { success: false, error: error.message };
      }

      // Apply the customization
      await this.applyCustomization(customization);

      return { success: true, data: updates };

    } catch (error) {
      console.error('Exception in updateUserCustomization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available themes for user based on level
   */
  async getAvailableThemes(userId) {
    try {
      const userLevel = await this.getUserLevel(userId);
      const availableThemes = [];

      for (const [themeId, theme] of Object.entries(this.themes)) {
        const isUnlocked = userLevel >= theme.unlockLevel;
        availableThemes.push({
          ...theme,
          isUnlocked: isUnlocked,
          lockReason: isUnlocked ? null : `Unlock at level ${theme.unlockLevel}`
        });
      }

      return { success: true, themes: availableThemes };

    } catch (error) {
      console.error('Error getting available themes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available layouts for user based on level
   */
  async getAvailableLayouts(userId) {
    try {
      const userLevel = await this.getUserLevel(userId);
      const availableLayouts = [];

      for (const [layoutId, layout] of Object.entries(this.layouts)) {
        const isUnlocked = userLevel >= layout.unlockLevel;
        availableLayouts.push({
          ...layout,
          isUnlocked: isUnlocked,
          lockReason: isUnlocked ? null : `Unlock at level ${layout.unlockLevel}`
        });
      }

      return { success: true, layouts: availableLayouts };

    } catch (error) {
      console.error('Error getting available layouts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply customization to the interface
   */
  async applyCustomization(customization) {
    try {
      const theme = this.themes[customization.theme] || this.themes.default;
      const layout = this.layouts[customization.layout] || this.layouts.standard;

      // Apply theme colors
      this.applyThemeColors(theme, customization.customColors);
      
      // Apply layout settings
      this.applyLayoutSettings(layout);
      
      // Apply user preferences
      this.applyUserPreferences(customization.preferences);

      this.currentTheme = customization.theme;
      this.currentLayout = customization.layout;

      return { success: true };

    } catch (error) {
      console.error('Error applying customization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply theme colors to CSS custom properties
   */
  applyThemeColors(theme, customColors = {}) {
    const colors = { ...theme.colors, ...customColors };
    const root = document.documentElement;

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });

    // Apply other theme properties
    root.style.setProperty('--border-radius', theme.borderRadius);
    
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }

  /**
   * Apply layout settings to interface elements
   */
  applyLayoutSettings(layout) {
    const settings = layout.settings;
    const root = document.documentElement;

    // Apply layout CSS classes
    document.body.className = `layout-${layout.id}`;
    
    // Apply layout variables
    Object.entries(settings).forEach(([key, value]) => {
      root.style.setProperty(`--layout-${key}`, value);
    });
  }

  /**
   * Apply user preferences
   */
  applyUserPreferences(preferences) {
    const root = document.documentElement;

    // Apply animation preferences
    if (preferences.reduceMotion) {
      root.style.setProperty('--animation-duration', '0.01s');
    }

    // Apply font size preferences
    if (preferences.fontSize) {
      root.style.setProperty('--font-size-base', preferences.fontSize);
    }

    // Apply contrast preferences
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    }
  }

  /**
   * Get user level for theme/layout unlocks
   */
  async getUserLevel(userId) {
    try {
      const { data, error } = await window.supabaseQuery('user_progress', 'select', 'current_level', { user_id: userId });

      if (error || !data || data.length === 0) {
        return 1; // Default level
      }

      return data[0].current_level || 1;

    } catch (error) {
      console.error('Error getting user level:', error);
      return 1;
    }
  }

  /**
   * Get default customization settings
   */
  getDefaultCustomization() {
    return {
      theme: 'default',
      layout: 'standard',
      customColors: {},
      preferences: {
        fontSize: '16px',
        reduceMotion: false,
        highContrast: false
      }
    };
  }

  /**
   * Create custom theme
   */
  async createCustomTheme(userId, themeName, colors) {
    try {
      const customTheme = {
        id: `custom_${Date.now()}`,
        name: themeName,
        description: 'Custom user theme',
        unlockLevel: 25,
        colors: colors,
        fonts: this.themes.default.fonts,
        borderRadius: '8px',
        shadows: this.themes.default.shadows,
        isCustom: true,
        createdBy: userId
      };

      // Save custom theme
      const { data, error } = await window.supabaseQuery('custom_themes', 'insert', {
        user_id: userId,
        theme_id: customTheme.id,
        theme_data: customTheme,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error creating custom theme:', error);
        return { success: false, error: error.message };
      }

      return { success: true, theme: customTheme };

    } catch (error) {
      console.error('Exception in createCustomTheme:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customization summary for popup
   */
  async getCustomizationSummary(userId) {
    try {
      const customization = await this.getUserCustomization(userId);
      const currentTheme = this.themes[customization.theme];
      const currentLayout = this.layouts[customization.layout];

      return {
        success: true,
        summary: {
          currentTheme: {
            name: currentTheme.name,
            description: currentTheme.description
          },
          currentLayout: {
            name: currentLayout.name,
            description: currentLayout.description
          },
          customizationLevel: await this.getUserLevel(userId),
          availableThemes: Object.keys(this.themes).length,
          availableLayouts: Object.keys(this.layouts).length
        }
      };

    } catch (error) {
      console.error('Error getting customization summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset customization to defaults
   */
  async resetCustomization(userId) {
    try {
      const defaultCustomization = this.getDefaultCustomization();
      const result = await this.updateUserCustomization(userId, defaultCustomization);
      
      if (result.success) {
        await this.applyCustomization(defaultCustomization);
      }

      return result;

    } catch (error) {
      console.error('Error resetting customization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export user customization settings
   */
  async exportCustomization(userId) {
    try {
      const customization = await this.getUserCustomization(userId);
      const exportData = {
        version: '1.0',
        userId: userId,
        theme: customization.theme,
        layout: customization.layout,
        customColors: customization.customColors,
        preferences: customization.preferences,
        exportedAt: new Date().toISOString()
      };

      return { success: true, data: exportData };

    } catch (error) {
      console.error('Error exporting customization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import user customization settings
   */
  async importCustomization(userId, importData) {
    try {
      if (!importData.version || importData.version !== '1.0') {
        return { success: false, error: 'Invalid import data version' };
      }

      const customization = {
        theme: importData.theme,
        layout: importData.layout,
        customColors: importData.customColors || {},
        preferences: importData.preferences || {}
      };

      const result = await this.updateUserCustomization(userId, customization);
      return result;

    } catch (error) {
      console.error('Error importing customization:', error);
      return { success: false, error: error.message };
    }
  }
}

// Make CustomizationManager globally accessible
window.CustomizationManager = CustomizationManager; 