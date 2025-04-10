# src/resource_manager.py

class ResourceManager:
    def __init__(self, starting_resources=200):
        # Store the *very first* starting amount if needed, or just the current level's
        self._initial_resources_current_level = starting_resources
        self._resources = starting_resources
        self.passive_income_rate = 2
        self.passive_timer = 0.0
        # print(f"ResourceManager Initialized with {self._resources} resources.") # Quieter init

    def reset(self, new_start_amount=None):
        """Resets resources. Uses new_start_amount if provided, else last known initial."""
        if new_start_amount is not None:
            self._initial_resources_current_level = new_start_amount # Update for the new level
            print(f"ResourceManager setting new start amount: {new_start_amount}")
        else:
             print(f"ResourceManager resetting to previous start amount: {self._initial_resources_current_level}")

        self._resources = self._initial_resources_current_level # Reset to current level's start
        self.passive_timer = 0.0
        print(f"ResourceManager reset. Current resources: {self._resources}")
        
    @property
    def resources(self):
        """Getter for the current resource amount."""
        return self._resources

    def add_resources(self, amount):
        """Adds resources."""
        if amount > 0:
            self._resources += amount
            print(f"Added {amount} resources. Total: {self._resources}")
            return True
        return False

    def spend_resources(self, amount):
        """Tries to spend resources. Returns True if successful, False otherwise."""
        if amount <= 0:
            return False # Cannot spend zero or negative
        if self._resources >= amount:
            self._resources -= amount
            print(f"Spent {amount} resources. Remaining: {self._resources}")
            return True
        else:
            print(f"Not enough resources. Needed {amount}, have {self._resources}")
            return False

    def update(self, dt):
         """Update passive resource generation."""
         self.passive_timer += dt
         if self.passive_timer >= 1.0:
             income = int(self.passive_timer * self.passive_income_rate) # Calculate income for the elapsed time
             if income > 0:
                  self.add_resources(income)
             self.passive_timer -= int(self.passive_timer) # Keep fractional part for next frame
