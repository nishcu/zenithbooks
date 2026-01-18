/**
 * Compliance Graph Engine
 * Config-driven compliance mapping based on entity types and system events
 */

import { 
  ComplianceRule, 
  EntityType, 
  SystemEventType, 
  ComplianceFrequency 
} from '../types';
import defaultRules from '../../../../data/compliance-rules/default-rules.json';

export class ComplianceGraphEngine {
  private rules: Map<string, ComplianceRule>;
  private entityRuleIndex: Map<EntityType, Set<string>>;
  private eventRuleIndex: Map<SystemEventType, Set<string>>;

  constructor() {
    this.rules = new Map();
    this.entityRuleIndex = new Map();
    this.eventRuleIndex = new Map();
    this.loadRules();
  }

  /**
   * Load compliance rules from JSON configuration
   */
  private loadRules(): void {
    const rulesData = defaultRules as { rules: ComplianceRule[] };
    
    rulesData.rules.forEach(rule => {
      // Convert date strings to Date objects if needed
      const processedRule: ComplianceRule = {
        ...rule,
        createdAt: rule.createdAt ? new Date(rule.createdAt as any) : new Date(),
        updatedAt: rule.updatedAt ? new Date(rule.updatedAt as any) : new Date(),
      };
      
      this.rules.set(rule.id, processedRule);
      
      // Index by entity type
      rule.entityTypes.forEach(entityType => {
        if (!this.entityRuleIndex.has(entityType)) {
          this.entityRuleIndex.set(entityType, new Set());
        }
        this.entityRuleIndex.get(entityType)!.add(rule.id);
      });
      
      // Index by trigger event
      if (!this.eventRuleIndex.has(rule.triggerEvent)) {
        this.eventRuleIndex.set(rule.triggerEvent, new Set());
      }
      this.eventRuleIndex.get(rule.triggerEvent)!.add(rule.id);
    });
  }

  /**
   * Get all compliance rules applicable for an entity type
   */
  getRulesByEntityType(entityType: EntityType): ComplianceRule[] {
    const ruleIds = this.entityRuleIndex.get(entityType) || new Set();
    return Array.from(ruleIds)
      .map(id => this.rules.get(id))
      .filter((rule): rule is ComplianceRule => rule !== undefined && rule.active);
  }

  /**
   * Get all compliance rules triggered by an event type
   */
  getRulesByEventType(eventType: SystemEventType): ComplianceRule[] {
    const ruleIds = this.eventRuleIndex.get(eventType) || new Set();
    return Array.from(ruleIds)
      .map(id => this.rules.get(id))
      .filter((rule): rule is ComplianceRule => rule !== undefined && rule.active);
  }

  /**
   * Resolve applicable compliances for a specific event and entity
   */
  resolveCompliances(
    eventType: SystemEventType,
    entityType: EntityType,
    eventData: Record<string, any> = {}
  ): ComplianceRule[] {
    // Get rules that match both event type and entity type
    const eventRules = this.getRulesByEventType(eventType);
    const entityRules = this.getRulesByEntityType(entityType);
    
    // Find intersection
    const applicableRules = eventRules.filter(rule => 
      entityRules.some(er => er.id === rule.id) &&
      this.evaluateTriggerConditions(rule, eventData)
    );
    
    // Sort by priority and dependencies
    return this.sortRulesByDependencies(applicableRules);
  }

  /**
   * Evaluate trigger conditions for a rule
   */
  private evaluateTriggerConditions(
    rule: ComplianceRule,
    eventData: Record<string, any>
  ): boolean {
    if (!rule.triggerConditions) {
      return true;
    }

    // Evaluate each condition
    for (const [key, value] of Object.entries(rule.triggerConditions)) {
      const eventValue = eventData[key];
      
      // Handle comparison operators (gte, lte, eq, etc.)
      if (typeof value === 'object' && value !== null) {
        if ('gte' in value && typeof eventValue === 'number') {
          if (eventValue < value.gte) return false;
        }
        if ('lte' in value && typeof eventValue === 'number') {
          if (eventValue > value.lte) return false;
        }
        if ('eq' in value) {
          if (eventValue !== value.eq) return false;
        }
      } else {
        // Direct equality check
        if (eventValue !== value) return false;
      }
    }
    
    return true;
  }

  /**
   * Sort rules by dependencies (dependencies first)
   */
  private sortRulesByDependencies(rules: ComplianceRule[]): ComplianceRule[] {
    const sorted: ComplianceRule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (rule: ComplianceRule) => {
      if (visiting.has(rule.id)) {
        // Circular dependency detected - skip
        return;
      }
      if (visited.has(rule.id)) {
        return;
      }

      visiting.add(rule.id);

      // Visit dependencies first
      if (rule.dependencies && rule.dependencies.length > 0) {
        rule.dependencies.forEach(depId => {
          const depRule = this.rules.get(depId);
          if (depRule) {
            visit(depRule);
          }
        });
      }

      visiting.delete(rule.id);
      visited.add(rule.id);
      sorted.push(rule);
    };

    rules.forEach(rule => visit(rule));
    return sorted;
  }

  /**
   * Calculate due date for a compliance rule
   */
  calculateDueDate(
    rule: ComplianceRule,
    triggerDate: Date = new Date()
  ): Date {
    const dueDate = new Date(triggerDate);

    switch (rule.dueDateLogic.type) {
      case 'fixed_day':
        // Set to fixed day of month
        const targetMonth = dueDate.getMonth() + (rule.dueDateLogic.monthOffset || 0);
        dueDate.setMonth(targetMonth);
        dueDate.setDate(rule.dueDateLogic.dayOfMonth || 1);
        break;

      case 'month_end':
        // Last day of current/next month
        const monthOffset = rule.dueDateLogic.monthOffset || 0;
        dueDate.setMonth(dueDate.getMonth() + monthOffset + 1, 0);
        break;

      case 'quarter_end':
        // Last day of quarter
        const quarter = Math.floor(dueDate.getMonth() / 3);
        dueDate.setMonth((quarter + 1) * 3, 0);
        break;

      case 'year_end':
        // Last day of financial year
        dueDate.setMonth(2, 0); // March 31
        if (dueDate < triggerDate) {
          dueDate.setFullYear(dueDate.getFullYear() + 1);
        }
        break;

      case 'days_after_event':
        // Add days after trigger
        dueDate.setDate(dueDate.getDate() + (rule.dueDateLogic.daysAfter || 0));
        break;

      default:
        // Default: same day
        break;
    }

    return dueDate;
  }

  /**
   * Get rule by ID
   */
  getRuleById(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all active rules
   */
  getAllActiveRules(): ComplianceRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.active);
  }
}

// Singleton instance
let graphEngineInstance: ComplianceGraphEngine | null = null;

export function getComplianceGraphEngine(): ComplianceGraphEngine {
  if (!graphEngineInstance) {
    graphEngineInstance = new ComplianceGraphEngine();
  }
  return graphEngineInstance;
}

