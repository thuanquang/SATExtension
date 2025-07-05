/**
 * CustomizationManager - Handles themes, avatars, and interface personalization
 * Manages unlockable content based on level progression and achievements
 */
import { getCurrentUserId } from '../db/supabase-client.js';

class CustomizationManager {
  constructor(supabaseClient, xpManager, badgeManager) {
    this.supabaseClient = supabaseClient;
    this.xpManager = xpManager;
    this.badgeManager = badgeManager;
    
    // Theme definitions with unlock requirements
    this.themes = {
      default: {
        id: 'default',
        name: 'Scholar Classic',
        description: 'Clean and professional academic theme',
        unlockLevel: 1,
        colors: {
          primary: '#007BFF',
          secondary: '#6c757d',
          background: '#FFFFFF',
          text: '#212529',
          accent: '#28a745'
        },
        isUnlocked: true
      },
      classic_scholar: {
        id: 'classic_scholar',
        name: 'Classic Scholar',
        description: 'Traditional academic colors with timeless appeal',
        unlockLevel: 3,
        colors: {
          primary: '#8B4513',
          secondary: '#A0522D',
          background: '#F5F5DC',
          text: '#2F4F4F',
          accent: '#CD853F'
        }
      },
      night_owl: {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Dark theme perfect for late-night study sessions',
        unlockLevel: 6,
        colors: {
          primary: '#4A90E2',
          secondary: '#7B68EE',
          background: '#1a1a1a',
          text: '#E0E0E0',
          accent: '#00CED1'
        }
      },
      minimalist: {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Clean and distraction-free design for focused learning',
        unlockLevel: 9,
        colors: {
          primary: '#333333',
          secondary: '#666666',
          background: '#FAFAFA',
          text: '#222222',
          accent: '#4CAF50'
        }
      },
      nature_scholar: {
        id: 'nature_scholar',
        name: 'Nature Scholar',
        description: 'Earth tones to bring natural calm to your studies',
        unlockLevel: 12,
        colors: {
          primary: '#2E7D32',
          secondary: '#4CAF50',
          background: '#F1F8E9',
          text: '#1B5E20',
          accent: '#8BC34A'
        }
      },
      tech_wizard: {
        id: 'tech_wizard',
        name: 'Tech Wizard',
        description: 'Futuristic design for the digital age learner',
        unlockLevel: 15,
        colors: {
          primary: '#9C27B0',
          secondary: '#E91E63',
          background: '#121212',
          text: '#BB86FC',
          accent: '#03DAC6'
        }
      },
      artistic_mind: {
        id: 'artistic_mind',
        name: 'Artistic Mind',
        description: 'Creative and colorful design to inspire innovation',
        unlockLevel: 18,
        colors: {
          primary: '#FF5722',
          secondary: '#FF9800',
          background: '#FFF8E1',
          text: '#BF360C',
          accent: '#FFEB3B'
        }
      },
      custom_creator: {
        id: 'custom_creator',
        name: 'Custom Creator',
        description: 'Create your own color scheme',
        unlockLevel: 21,
        colors: {
          primary: '#6200EA',
          secondary: '#3700B3',
          background: '#FFFFFF',
          text: '#000000',
          accent: '#018786'
        },
        isCustomizable: true
      }
    };

    // Avatar definitions
    this.avatars = {
      animals: ['Owl', 'Fox', 'Cat', 'Dog', 'Rabbit', 'Eagle', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Dolphin', 'Whale', 'Shark', 'Turtle', 'Penguin'],
      colors: ['Blue', 'Green', 'Red', 'Purple', 'Orange', 'Yellow', 'Pink', 'Teal', 'Indigo', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Amber'],
      accessories: {
        glasses: { unlockLevel: 4, name: 'Study Glasses', icon: '👓' },
        graduation_cap: { unlockLevel: 7, name: 'Graduation Cap', icon: '🎓' },
        bowtie: { unlockLevel: 10, name: 'Scholarly Bowtie', icon: '🎀' },
        crown: { unlockLevel: 13, name: 'Knowledge Crown', icon: '👑' },
        wizard_hat: { unlockLevel: 16, name: 'Wisdom Hat', icon: '🧙‍♂️' },
        superhero_cape: { unlockLevel: 19, name: 'Learning Cape', icon: '🦸‍♂️' }
      },
      poses: {
        confident: { unlockLevel: 7, name: 'Confident Pose', description: 'Ready to tackle any challenge' },
        thoughtful: { unlockLevel: 11, name: 'Thoughtful Pose', description: 'Deep in concentration' },
        celebratory: { unlockLevel: 16, name: 'Victory Pose', description: 'Celebrating achievements' }
      }
    };

    // Interface customization options
    this.interfaceOptions = {
      modalFrames: {
        standard: { unlockLevel: 1, name: 'Standard Frame' },
        decorative: { unlockLevel: 5, name: 'Decorative Frame' },
        geometric: { unlockLevel: 8, name: 'Geometric Frame' },
        organic: { unlockLevel: 11, name: 'Organic Frame' },
        futuristic: { unlockLevel: 14, name: 'Futuristic Frame' },
        artistic: { unlockLevel: 17, name: 'Artistic Frame' }
      },
      animations: {
        subtle: { unlockLevel: 1, name: 'Subtle Animations' },
        enhanced: { unlockLevel: 6, name: 'Enhanced Animations' },
        dynamic: { unlockLevel: 12, name: 'Dynamic Animations' },
        spectacular: { unlockLevel: 18, name: 'Spectacular Animations' }
      }
    };

    console.log('🎨 Customization Manager initialized');
  }

  /**
   * Initialize customization system for user
   */
  async initializeCustomization() {
    try {
      console.log('🎨 Initializing customization for user:', await getCurrentUserId());
      
      // Load or create user customization preferences
      let userCustomizations = await this.getUserCustomizations();
      
      if (!userCustomizations) {
        // Create default customizations
        userCustomizations = await this.createDefaultCustomizations();
      }
      
      // Check for new unlocks based on current level and badges
      await this.checkForNewUnlocks();
      
      console.log('🎨 Customization system initialized');
      return { success: true, customizations: userCustomizations };
    } catch (error) {
      console.error('🎨 Error initializing customization:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's current customization preferences
   */
  async getUserCustomizations() {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('user_customizations')
        .select('*')
        .eq('user_id', await getCurrentUserId())
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('🎨 Error getting user customizations:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🎨 Error in getUserCustomizations:', error);
      return null;
    }
  }

  /**
   * Create default customization preferences
   */
  async createDefaultCustomizations() {
    try {
      const defaultCustomizations = {
        user_id: await getCurrentUserId(),
        theme_id: 'default',
        avatar_config: {
          animal: this.avatars.animals[0], // Owl
          color: this.avatars.colors[0],   // Blue
          accessories: [],
          pose: 'confident'
        },
        interface_preferences: {
          modal_frame: 'standard',
          animations: 'subtle',
          sound_effects: false,
          reduced_motion: false
        },
        privacy_settings: {
          show_in_leaderboards: true,
          share_achievements: true,
          anonymous_mode: false
        },
        goal_settings: {
          target_level: 10,
          weekly_question_goal: 50,
          daily_streak_goal: 7
        }
      };

      const { data, error } = await this.supabaseClient.supabase
        .from('user_customizations')
        .insert(defaultCustomizations)
        .select()
        .single();

      if (error) {
        console.error('🎨 Error creating default customizations:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🎨 Error in createDefaultCustomizations:', error);
      return null;
    }
  }

  /**
   * Check for new unlocks based on level and achievements
   */
  async checkForNewUnlocks() {
    try {
      const userProgress = await this.xpManager.getUserProgress();
      const currentLevel = userProgress.current_level || 1;
      
      const newUnlocks = {
        themes: [],
        avatarAccessories: [],
        avatarPoses: [],
        interfaceOptions: []
      };

      // Check theme unlocks
      for (const [themeId, theme] of Object.entries(this.themes)) {
        if (currentLevel >= theme.unlockLevel && !theme.isUnlocked) {
          newUnlocks.themes.push(theme);
        }
      }

      // Check avatar accessory unlocks
      for (const [accessoryId, accessory] of Object.entries(this.avatars.accessories)) {
        if (currentLevel >= accessory.unlockLevel) {
          newUnlocks.avatarAccessories.push({ id: accessoryId, ...accessory });
        }
      }

      // Check avatar pose unlocks
      for (const [poseId, pose] of Object.entries(this.avatars.poses)) {
        if (currentLevel >= pose.unlockLevel) {
          newUnlocks.avatarPoses.push({ id: poseId, ...pose });
        }
      }

      // Check interface option unlocks
      for (const category of Object.keys(this.interfaceOptions)) {
        for (const [optionId, option] of Object.entries(this.interfaceOptions[category])) {
          if (currentLevel >= option.unlockLevel) {
            newUnlocks.interfaceOptions.push({ 
              category, 
              id: optionId, 
              ...option 
            });
          }
        }
      }

      // Award XP for unlocks if any
      if (newUnlocks.themes.length > 0 || 
          newUnlocks.avatarAccessories.length > 0 || 
          newUnlocks.avatarPoses.length > 0 || 
          newUnlocks.interfaceOptions.length > 0) {
        
        const unlockBonus = (newUnlocks.themes.length * 25) + 
                           (newUnlocks.avatarAccessories.length * 15) + 
                           (newUnlocks.avatarPoses.length * 20) + 
                           (newUnlocks.interfaceOptions.length * 10);

        if (unlockBonus > 0) {
          await this.xpManager.awardXP(await getCurrentUserId(), unlockBonus, {
            source: 'customization_unlock',
            unlockCount: Object.values(newUnlocks).flat().length
          });
        }
      }

      return newUnlocks;
    } catch (error) {
      console.error('🎨 Error checking for new unlocks:', error);
      return {};
    }
  }

  /**
   * Update user's theme
   */
  async updateTheme() {
    try {
      // Verify theme is unlocked
      const isUnlocked = await this.isThemeUnlocked();
      if (!isUnlocked) {
        return { 
          success: false, 
          error: 'Theme not unlocked',
          requiredLevel: this.themes[themeId]?.unlockLevel || 1
        };
      }

      const { data, error } = await this.supabaseClient.supabase
        .from('user_customizations')
        .update({ 
          theme_id: themeId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', await getCurrentUserId())
        .select();

      if (error) {
        console.error('🎨 Error updating theme:', error);
        return { success: false, error: error.message };
      }

      return { success: true, theme: this.themes[themeId] };
    } catch (error) {
      console.error('🎨 Error in updateTheme:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's avatar configuration
   */
  async updateAvatar(avatarConfig) {
    try {
      // Validate avatar configuration
      const validation = this.validateAvatarConfig(avatarConfig);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid avatar configuration',
          details: validation.errors
        };
      }

      const { data, error } = await this.supabaseClient.supabase
        .from('user_customizations')
        .update({ 
          avatar_config: avatarConfig,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', await getCurrentUserId())
        .select();

      if (error) {
        console.error('🎨 Error updating avatar:', error);
        return { success: false, error: error.message };
      }

      return { success: true, avatar: avatarConfig };
    } catch (error) {
      console.error('🎨 Error in updateAvatar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update interface preferences
   */
  async updateInterfacePreferences(preferences) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('user_customizations')
        .update({ 
          interface_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', await getCurrentUserId())
        .select();

      if (error) {
        console.error('🎨 Error updating interface preferences:', error);
        return { success: false, error: error.message };
      }

      return { success: true, preferences };
    } catch (error) {
      console.error('🎨 Error in updateInterfacePreferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if theme is unlocked for user
   */
  async isThemeUnlocked() {
    try {
      const theme = this.themes[themeId];
      if (!theme) return false;

      if (theme.id === 'default') return true;

      const userProgress = await this.xpManager.getUserProgress();
      const currentLevel = userProgress.current_level || 1;

      return currentLevel >= theme.unlockLevel;
    } catch (error) {
      console.error('🎨 Error checking theme unlock:', error);
      return false;
    }
  }

  /**
   * Validate avatar configuration
   */
  async validateAvatarConfig(config) {
    const errors = [];
    
    // Check animal
    if (!this.avatars.animals.includes(config.animal)) {
      errors.push('Invalid animal selection');
    }

    // Check color
    if (!this.avatars.colors.includes(config.color)) {
      errors.push('Invalid color selection');
    }

    // Check accessories
    if (config.accessories && Array.isArray(config.accessories)) {
      const userProgress = await this.xpManager.getUserProgress();
      const currentLevel = userProgress.current_level || 1;

      for (const accessoryId of config.accessories) {
        const accessory = this.avatars.accessories[accessoryId];
        if (!accessory) {
          errors.push(`Invalid accessory: ${accessoryId}`);
        } else if (currentLevel < accessory.unlockLevel) {
          errors.push(`Accessory not unlocked: ${accessory.name} (requires level ${accessory.unlockLevel})`);
        }
      }
    }

    // Check pose
    if (config.pose) {
      const pose = this.avatars.poses[config.pose];
      if (!pose) {
        errors.push('Invalid pose selection');
      } else {
        const userProgress = await this.xpManager.getUserProgress();
        const currentLevel = userProgress.current_level || 1;
        
        if (currentLevel < pose.unlockLevel) {
          errors.push(`Pose not unlocked: ${pose.name} (requires level ${pose.unlockLevel})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all available customization options for user
   */
  async getAvailableCustomizations() {
    try {
      const userProgress = await this.xpManager.getUserProgress();
      const currentLevel = userProgress.current_level || 1;

      const available = {
        themes: {},
        avatars: {
          animals: this.avatars.animals,
          colors: this.avatars.colors,
          accessories: {},
          poses: {}
        },
        interface: {}
      };

      // Add available themes
      for (const [themeId, theme] of Object.entries(this.themes)) {
        available.themes[themeId] = {
          ...theme,
          isUnlocked: currentLevel >= theme.unlockLevel
        };
      }

      // Add available avatar accessories
      for (const [accessoryId, accessory] of Object.entries(this.avatars.accessories)) {
        available.avatars.accessories[accessoryId] = {
          ...accessory,
          isUnlocked: currentLevel >= accessory.unlockLevel
        };
      }

      // Add available avatar poses
      for (const [poseId, pose] of Object.entries(this.avatars.poses)) {
        available.avatars.poses[poseId] = {
          ...pose,
          isUnlocked: currentLevel >= pose.unlockLevel
        };
      }

      // Add available interface options
      for (const [category, options] of Object.entries(this.interfaceOptions)) {
        available.interface[category] = {};
        for (const [optionId, option] of Object.entries(options)) {
          available.interface[category][optionId] = {
            ...option,
            isUnlocked: currentLevel >= option.unlockLevel
          };
        }
      }

      return {
        success: true,
        customizations: available,
        userLevel: currentLevel
      };
    } catch (error) {
      console.error('🎨 Error getting available customizations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply theme to quiz interface
   */
  applyThemeToInterface(themeId) {
    try {
      const theme = this.themes[themeId];
      if (!theme) {
        console.error('🎨 Theme not found:', themeId);
        return;
      }

      // Create CSS custom properties for the theme
      const root = document.documentElement;
      root.style.setProperty('--qas-blue', theme.colors.primary);
      root.style.setProperty('--qas-dark-text', theme.colors.text);
      root.style.setProperty('--qas-light-text', theme.colors.secondary);
      root.style.setProperty('--qas-background', theme.colors.background);
      root.style.setProperty('--qas-success', theme.colors.accent);

      console.log('🎨 Theme applied:', theme.name);
      return { success: true, theme: theme.name };
    } catch (error) {
      console.error('🎨 Error applying theme:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate avatar display
   */
  generateAvatarDisplay(avatarConfig) {
    try {
      const { animal, color, accessories, pose } = avatarConfig;
      
      // Create avatar representation
      const avatar = {
        display: `${color} ${animal}`,
        emoji: this.getAnimalEmoji(animal),
        accessories: accessories?.map(id => this.avatars.accessories[id]) || [],
        pose: pose || 'confident',
        style: {
          color: this.getColorCode(color),
          pose: pose || 'confident'
        }
      };

      return avatar;
    } catch (error) {
      console.error('🎨 Error generating avatar display:', error);
      return null;
    }
  }

  /**
   * Get animal emoji representation
   */
  getAnimalEmoji(animal) {
    const emojiMap = {
      'Owl': '🦉', 'Fox': '🦊', 'Cat': '🐱', 'Dog': '🐶', 'Rabbit': '🐰',
      'Eagle': '🦅', 'Wolf': '🐺', 'Bear': '🐻', 'Lion': '🦁', 'Tiger': '🐯',
      'Dolphin': '🐬', 'Whale': '🐋', 'Shark': '🦈', 'Turtle': '🐢', 'Penguin': '🐧'
    };
    return emojiMap[animal] || '🐾';
  }

  /**
   * Get color code for avatar
   */
  getColorCode(color) {
    const colorMap = {
      'Blue': '#007BFF', 'Green': '#28a745', 'Red': '#dc3545', 'Purple': '#6f42c1',
      'Orange': '#fd7e14', 'Yellow': '#ffc107', 'Pink': '#e83e8c', 'Teal': '#20c997',
      'Indigo': '#6610f2', 'Crimson': '#dc143c', 'Azure': '#007fff', 'Emerald': '#50c878',
      'Violet': '#8a2be2', 'Amber': '#ffbf00'
    };
    return colorMap[color] || '#007BFF';
  }

  /**
   * Get customization summary for display
   */
  async getCustomizationSummary() {
    try {
      const [userCustomizations, availableOptions] = await Promise.all([
        this.getUserCustomizations(),
        this.getAvailableCustomizations()
      ]);

      if (!userCustomizations) {
        return { success: false, error: 'No customizations found' };
      }

      const summary = {
        currentTheme: this.themes[userCustomizations.theme_id],
        currentAvatar: this.generateAvatarDisplay(userCustomizations.avatar_config),
        interfaceSettings: userCustomizations.interface_preferences,
        availableOptions: availableOptions.customizations,
        unlockedCount: this.countUnlockedOptions(availableOptions.customizations),
        totalCount: this.countTotalOptions()
      };

      return { success: true, customization: summary };
    } catch (error) {
      console.error('🎨 Error getting customization summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count unlocked customization options
   */
  countUnlockedOptions(options) {
    let count = 0;
    
    // Count themes
    for (const theme of Object.values(options.themes)) {
      if (theme.isUnlocked) count++;
    }
    
    // Count accessories
    for (const accessory of Object.values(options.avatars.accessories)) {
      if (accessory.isUnlocked) count++;
    }
    
    // Count poses
    for (const pose of Object.values(options.avatars.poses)) {
      if (pose.isUnlocked) count++;
    }
    
    // Count interface options
    for (const category of Object.values(options.interface)) {
      for (const option of Object.values(category)) {
        if (option.isUnlocked) count++;
      }
    }
    
    return count;
  }

  /**
   * Count total customization options
   */
  countTotalOptions() {
    return Object.keys(this.themes).length +
           Object.keys(this.avatars.accessories).length +
           Object.keys(this.avatars.poses).length +
           Object.values(this.interfaceOptions).reduce((sum, category) => 
             sum + Object.keys(category).length, 0);
  }

  /**
   * Get next unlock information
   */
  async getNextUnlocks() {
    try {
      const userProgress = await this.xpManager.getUserProgress();
      const currentLevel = userProgress.current_level || 1;
      
      const nextUnlocks = [];
      
      // Check themes
      for (const theme of Object.values(this.themes)) {
        if (theme.unlockLevel > currentLevel && theme.unlockLevel <= currentLevel + 5) {
          nextUnlocks.push({
            type: 'theme',
            name: theme.name,
            level: theme.unlockLevel,
            description: theme.description
          });
        }
      }
      
      // Check accessories
      for (const [id, accessory] of Object.entries(this.avatars.accessories)) {
        if (accessory.unlockLevel > currentLevel && accessory.unlockLevel <= currentLevel + 5) {
          nextUnlocks.push({
            type: 'accessory',
            name: accessory.name,
            level: accessory.unlockLevel,
            icon: accessory.icon
          });
        }
      }
      
      // Sort by level
      nextUnlocks.sort((a, b) => a.level - b.level);
      
      return { success: true, unlocks: nextUnlocks.slice(0, 5) }; // Show next 5 unlocks
    } catch (error) {
      console.error('🎨 Error getting next unlocks:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.CustomizationManager = CustomizationManager;
} 