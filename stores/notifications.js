import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    isLoading: false,
    error: null
  }),
  
  getters: {
    unreadCount: (state) => {
      return state.notifications.filter(n => !n.read).length;
    }
  },
  
  actions: {
    fetchNotifications() {
      this.isLoading = true;
      this.error = null;
      
      try {
        // In a real app, this would be an API call
        // For demo, we'll use mock data
        this.notifications = [
          {
            id: '1',
            title: 'New sensor added',
            message: 'Temperature Sensor 3 has been added',
            read: false,
            type: 'sensor',
            timestamp: new Date(Date.now() - 25 * 60000).toISOString()
          },
          {
            id: '2',
            title: 'Alert triggered',
            message: 'Temperature exceeded threshold in Server Room 1',
            read: false,
            type: 'alert',
            timestamp: new Date(Date.now() - 55 * 60000).toISOString()
          },
          {
            id: '3',
            title: 'System maintenance',
            message: 'Scheduled maintenance in 24 hours',
            read: true,
            type: 'system',
            timestamp: new Date(Date.now() - 180 * 60000).toISOString()
          },
          {
            id: '4',
            title: 'New user registered',
            message: 'John Doe has registered as a technician',
            read: true,
            type: 'user',
            timestamp: new Date(Date.now() - 1440 * 60000).toISOString()
          }
        ];
        
        return this.notifications;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    
    markAsRead(id) {
      const notification = this.notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
      }
    },
    
    markAllAsRead() {
      this.notifications.forEach(n => {
        n.read = true;
      });
    },
    
    addNotification(notification) {
      this.notifications.unshift({
        id: String(Date.now()),
        read: false,
        timestamp: new Date().toISOString(),
        ...notification
      });
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    }
  }
});