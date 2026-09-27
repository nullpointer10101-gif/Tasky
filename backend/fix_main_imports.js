const fs = require('fs');

const mainGoPath = 'd:/antigravity/HashBee/backend/cmd/server/main.go';
let mainGoCode = fs.readFileSync(mainGoPath, 'utf8');

const oldImports = `import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"hashbee/internal/bot"
	"hashbee/internal/config"
	"hashbee/internal/db"
	"hashbee/internal/handlers"
	"hashbee/internal/middleware"
	"hashbee/internal/services"
)`;

const newImports = `import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"hashbee/internal/bot"
	"hashbee/internal/config"
	"hashbee/internal/db"
	"hashbee/internal/handlers"
	"hashbee/internal/middleware"
	"hashbee/internal/services"
)`;

if (mainGoCode.includes(oldImports)) {
  mainGoCode = mainGoCode.replace(oldImports, newImports);
} else {
  mainGoCode = mainGoCode.replace(
    /import \([\s\S]*?\)/,
    newImports
  );
}

fs.writeFileSync(mainGoPath, mainGoCode, 'utf8');
console.log('✅ main.go imports updated with uuid and bcrypt!');
